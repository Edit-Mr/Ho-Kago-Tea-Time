import { create } from "zustand";
import type GeoJSON from "geojson";
import { fetchAreaByPoint, fetchAreaRiskSnapshots, fetchAreas, fetchFacilities, fetchFacilityInspections, fetchFacilityTypes, fetchTicketEvents, fetchTickets } from "../lib/api";

export type AreaRecord = {
  id: string;
  name: string;
  code?: string | null;
  county: string;
  geom?: GeoJSON.Geometry;
  populationTotal?: number | null;
  riskScore?: number;
};

type AreaOption = Pick<AreaRecord, "id" | "name" | "code" | "county">;

export type FacilityRecord = {
  id: string;
  areaId?: string | null;
  type: string;
  typeLabel?: string;
  typeEmoji?: string | null;
  typeIconName?: string | null;
  name: string;
  coords?: [number, number];
  grade?: "A" | "B" | "C";
  lastInspection?: string;
  incidentsPastYear?: number;
  latestInspectionNotes?: string | null;
};

export type TicketRecord = {
  id: string;
  areaId?: string | null;
  facilityId?: string | null;
  coords?: [number, number];
  status: string;
  type: string;
  severity?: number | null;
  slaDueAt?: string | null;
  createdAt?: string | null;
  description?: string | null;
  photoUrls?: string[] | null;
};

export type TicketEventRecord = {
  ticketId: string;
  eventType: string;
  createdAt: string;
  data?: Record<string, unknown> | null;
};

type DataState = {
  areas: AreaRecord[];
  areaOptions: AreaOption[];
  facilities: FacilityRecord[];
  tickets: TicketRecord[];
  ticketEvents: TicketEventRecord[];
  areaRiskSnapshots: Array<{ areaId: string; riskScore: number; computedAt: string; _computedAtRaw: string }>;
  facilityTypes: Array<{ type: string; labelZh: string; emoji?: string | null; iconName?: string | null }>;
  currentAreaId?: string;
  currentCounty?: string;
  loading: boolean;
  error?: string;
  loadAll: (opts?: { areaId?: string; center?: [number, number]; lightAreas?: boolean; namesOnly?: boolean }) => Promise<void>;
};

export const useDataStore = create<DataState>((set, get) => ({
  areas: [],
  areaOptions: [],
  facilities: [],
  tickets: [],
  ticketEvents: [],
  areaRiskSnapshots: [],
  facilityTypes: [],
  currentAreaId: undefined,
  currentCounty: undefined,
  loading: false,
  error: undefined,
  loadAll: async (opts) => {
    try {
      const stateBeforeFetch = get();
      if (!opts?.lightAreas && opts?.center && stateBeforeFetch.currentCounty && stateBeforeFetch.areas.length > 0) {
        const insideExistingCounty = stateBeforeFetch.areas.some((a) => a.county === stateBeforeFetch.currentCounty && a.geom && isPointInsideGeometry(opts.center as [number, number], a.geom));
        if (insideExistingCounty) {
          return;
        }
      }

      const onlyNeedLightAreas = !!opts?.lightAreas && !opts?.areaId && !opts?.center;
      const namesOnly = !!opts?.namesOnly;
      set({ loading: !namesOnly, error: undefined });

      let countyFilter: string | undefined;
      let areaFromPoint: { id: string; county: string } | undefined;
      const needsGeom = !opts?.lightAreas || !!opts?.center;
      if (opts?.center && needsGeom) {
        const areaByPoint = await fetchAreaByPoint(opts.center);
        if (areaByPoint.error) throw new Error(areaByPoint.error);
        areaFromPoint = areaByPoint.data;
        countyFilter = areaFromPoint?.county;
      }

      countyFilter = countyFilter ?? get().currentCounty;

      const stateAfterAreaLookup = get();
      const tentativeAreaId = opts?.areaId ?? areaFromPoint?.id;
      if (
        tentativeAreaId &&
        countyFilter &&
        stateAfterAreaLookup.currentAreaId === tentativeAreaId &&
        stateAfterAreaLookup.currentCounty === countyFilter &&
        stateAfterAreaLookup.facilities.length > 0 &&
        stateAfterAreaLookup.tickets.length > 0
      ) {
        set({ loading: false });
        return;
      }

      const areaSelect = needsGeom ? "full" : "lite";
      const areasRes = await fetchAreas(
        countyFilter
          ? { county: countyFilter, select: areaSelect }
          : tentativeAreaId
            ? { areaId: tentativeAreaId, select: areaSelect }
            : { select: areaSelect }
      );
      if (areasRes.error) throw new Error(areasRes.error);

      const areas = areasRes.data?.map((a) => ({
        id: a.id,
        name: a.name,
        code: a.code,
        county: a.county,
        geom: a.geom as GeoJSON.Geometry,
        populationTotal: a.populationTotal,
        riskScore: undefined,
      })) ?? [];
      if (areas.some((a) => !a.county)) throw new Error("區域資料缺少 county 欄位或值，請確認資料庫縣市欄位已填寫");

      if (onlyNeedLightAreas && namesOnly) {
        set((prev) => ({
          areas,
          areaOptions: areas.map(({ id, name, code, county }) => ({ id, name, code, county })),
          // 保留既有的詳細資料，僅更新選單
          facilities: prev.facilities,
          tickets: prev.tickets,
          facilityTypes: prev.facilityTypes,
          currentAreaId: prev.currentAreaId,
          currentCounty: prev.currentCounty,
          ticketEvents: prev.ticketEvents,
          areaRiskSnapshots: prev.areaRiskSnapshots,
          loading: false,
          error: undefined,
        }));
        return;
      }

      const targetAreaId = opts?.areaId
        ? opts.areaId
        : areaFromPoint?.id
          ? areaFromPoint.id
          : needsGeom
            ? pickAreaByCenter(areas.filter((a) => a.geom) as AreaRecord[], opts?.center)
            : areas[0]?.id;
      if (!targetAreaId) throw new Error("找不到可用的行政區，無法載入地圖資料");
      if (targetAreaId && get().currentAreaId === targetAreaId && get().facilities.length > 0) {
        set({ loading: false });
        return;
      }

      const [facilitiesRes, ticketsRes] = await Promise.all([fetchFacilities(targetAreaId), fetchTickets(targetAreaId)]);
      if (facilitiesRes.error) throw new Error(facilitiesRes.error);
      if (ticketsRes.error) throw new Error(ticketsRes.error);

      const [riskRes, facilityTypesRes] = await Promise.all([fetchAreaRiskSnapshots(), fetchFacilityTypes()]);
      if (facilityTypesRes.error) throw new Error(facilityTypesRes.error);

      const facilityIds = facilitiesRes.data?.map((f) => f.id) ?? [];
      const ticketIds = ticketsRes.data?.map((t) => t.id) ?? [];
      const [inspectionsRes, ticketEventsRes] = await Promise.all([fetchFacilityInspections(facilityIds), fetchTicketEvents(ticketIds)]);
      if (inspectionsRes.error) throw new Error(inspectionsRes.error);
      if (ticketEventsRes.error) throw new Error(ticketEventsRes.error);

      const latestRiskByArea = new Map<string, { score: number; at: number }>();
      riskRes.data?.forEach((r) => {
        const existing = latestRiskByArea.get(r.areaId);
        const computedAtMs = new Date(r._computedAtRaw).getTime();
        if (!existing || computedAtMs > existing.at) {
          latestRiskByArea.set(r.areaId, { score: r.riskScore, at: computedAtMs });
        }
      });

      const latestInspectionByFacility = new Map<string, { incidentCount?: number; notes?: string | null; inspectedAt: string }>();
      inspectionsRes.data?.forEach((row) => {
        const prev = latestInspectionByFacility.get(row.facilityId);
        if (!prev || new Date(row.inspectedAt).getTime() > new Date(prev.inspectedAt).getTime()) {
          latestInspectionByFacility.set(row.facilityId, {
            incidentCount: row.incidentCountLastYear ?? undefined,
            notes: row.notes,
            inspectedAt: row.inspectedAt,
          });
        }
      });

      const typeMeta = new Map<string, { labelZh: string; emoji?: string | null; iconName?: string | null }>();
      facilityTypesRes.data?.forEach((t) => typeMeta.set(t.type, { labelZh: t.labelZh, emoji: t.emoji, iconName: t.iconName }));

      const facilities = facilitiesRes.data?.map((f) => {
        const latestInspection = latestInspectionByFacility.get(f.id);
        const meta = typeMeta.get(f.type);
        return {
          id: f.id,
          areaId: f.areaId,
          type: f.type,
          typeLabel: meta?.labelZh ?? undefined,
          typeEmoji: meta?.emoji ?? null,
          typeIconName: meta?.iconName ?? null,
          name: f.name,
          coords: (f.geom as GeoJSON.Point | undefined)?.coordinates as [number, number] | undefined,
          grade: (f.healthGrade as FacilityRecord["grade"]) ?? undefined,
          lastInspection: latestInspection?.inspectedAt ?? f.lastInspectionAt ?? undefined,
          incidentsPastYear: latestInspection?.incidentCount ?? undefined,
          latestInspectionNotes: latestInspection?.notes ?? null,
        } satisfies FacilityRecord;
      }) ?? [];

      const tickets = ticketsRes.data?.map((t) => ({
        id: t.id,
        areaId: t.areaId,
        facilityId: t.facilityId,
        coords: (t.geom as GeoJSON.Point | undefined)?.coordinates as [number, number] | undefined,
        status: t.status,
        type: t.type,
        severity: t.severity,
        slaDueAt: t.slaDueAt,
        createdAt: t.createdAt,
        description: t.description,
        photoUrls: t.photoUrls,
      })) ?? [];

      const areasWithRisk = areas.map((a) => ({
        ...a,
        riskScore: latestRiskByArea.get(a.id)?.score,
      }));

      const targetArea = areasWithRisk.find((a) => a.id === targetAreaId);
      const filteredAreas = targetArea?.county
        ? areasWithRisk.filter((a) => a.county === targetArea.county)
        : areasWithRisk.filter((a) => a.id === targetAreaId);
      const filteredRisk = (riskRes.data ?? []).filter((r) => filteredAreas.some((a) => a.id === r.areaId));

      set({
        areas: filteredAreas,
        areaOptions: get().areaOptions.length > 0 ? get().areaOptions : areas.map(({ id, name, code, county }) => ({ id, name, code, county })),
        facilities,
        tickets,
        facilityTypes: facilityTypesRes.data ?? [],
        currentAreaId: targetAreaId,
        currentCounty: targetArea?.county ?? countyFilter,
        ticketEvents: ticketEventsRes.data ?? [],
        areaRiskSnapshots: filteredRisk,
        loading: false,
        error: undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      set({ error: message, loading: false });
    }
  },
}));

function pickAreaByCenter(areas: AreaRecord[], center?: [number, number]) {
  if (!center) return undefined;
  const [lng, lat] = center;
  for (const area of areas) {
    if (area.geom && isPointInsideGeometry([lng, lat], area.geom)) return area.id;
  }
  // fallback: nearest bbox center
  let best: { id: string; dist: number } | undefined;
  areas.forEach((a) => {
    const c = bboxCenter(a.geom);
    const dist = distanceSq(center, c);
    if (!best || dist < best.dist) best = { id: a.id, dist };
  });
  return best?.id;
}

function isPointInsideGeometry(point: [number, number], geom: GeoJSON.Geometry): boolean {
  if (geom.type === "Polygon") return isPointInPolygon(point, geom.coordinates as GeoJSON.Position[][]);
  if (geom.type === "MultiPolygon") return (geom.coordinates as GeoJSON.Position[][][]).some((poly) => isPointInPolygon(point, poly));
  return false;
}

function isPointInPolygon(point: [number, number], rings: GeoJSON.Position[][]): boolean {
  const [lng, lat] = point;
  let inside = false;
  const ring = rings[0];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function bboxCenter(geom: GeoJSON.Geometry): [number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const visit = (coords: any) => {
    if (typeof coords[0] === "number") {
      const [x, y] = coords as [number, number];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    } else {
      coords.forEach(visit);
    }
  };
  visit((geom as any).coordinates);
  if (minX === Infinity) return [0, 0];
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

function distanceSq(a: [number, number], b: [number, number]) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}
