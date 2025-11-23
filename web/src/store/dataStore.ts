import { create } from "zustand";
import type GeoJSON from "geojson";
import { fetchAreaByPoint, fetchAreaRiskSnapshots, fetchAreas, fetchFacilities, fetchFacilityTypes, fetchTicketEvents, fetchTickets, fetchBuildingAges, fetchNoiseMeasurements } from "../lib/api";

let currentLoadToken = 0;

export type AreaRecord = {
  id: string;
  name: string;
  code?: string | null;
  county: string;
  geom?: GeoJSON.Geometry;
  populationTotal?: number | null;
  riskScore?: number;
  genderRatio?: number | null;
  weightedAvgAge?: number | null;
};

type AreaOption = Pick<AreaRecord, "id" | "name" | "code" | "county">;

export type FacilityRecord = {
  id: string;
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
  buildingAges: Array<{ id: string; name: string; coords: [number, number]; ageYears: number }>;
  noiseMeasurements: Array<{ id: string; name: string; coords: [number, number]; morning: number; afternoon: number; night: number }>;
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
  buildingAges: [],
  noiseMeasurements: [],
  currentAreaId: undefined,
  currentCounty: undefined,
  loading: false,
  error: undefined,
  loadAll: async (opts) => {
    const token = ++currentLoadToken;
    const isStale = () => token !== currentLoadToken;
    try {
      const onlyNeedLightAreas = !!opts?.lightAreas && !opts?.areaId && !opts?.center;
      const namesOnly = !!opts?.namesOnly;

      // If only need names and we already have areaOptions, skip
      if (onlyNeedLightAreas && namesOnly && get().areaOptions.length > 0) {
        return;
      }

      set({ loading: !namesOnly, error: undefined });

      let countyFilter: string | undefined;
      let areaFromPoint: { id: string; county: string } | undefined;
      const needsGeom = !opts?.lightAreas || !!opts?.center;
      if (opts?.center && needsGeom) {
        const areaByPoint = await fetchAreaByPoint(opts.center);
        if (isStale()) return;
        if (areaByPoint.error) throw new Error(areaByPoint.error);
        areaFromPoint = areaByPoint.data;
        countyFilter = areaFromPoint?.county;
      }

      countyFilter = countyFilter ?? get().currentCounty;

      const stateBeforeFetch = get();
      if (
        !opts?.lightAreas &&
        countyFilter &&
        stateBeforeFetch.currentCounty === countyFilter &&
        stateBeforeFetch.facilities.length > 0 &&
        stateBeforeFetch.tickets.length > 0
      ) {
        if (
          !opts?.center ||
          stateBeforeFetch.areas.some((a) => a.county === countyFilter && a.geom && isPointInsideGeometry(opts.center as [number, number], a.geom))
        ) {
          set({ loading: false });
          return;
        }
      }

      const areaSelect = needsGeom ? "full" : "lite";
      const areasRes = await fetchAreas(
        opts?.areaId
          ? { areaId: opts.areaId, select: areaSelect, level: "village" }
          : countyFilter
            ? { county: countyFilter, select: areaSelect, level: "village" }
            : { select: areaSelect, level: "village" }
      );
      if (isStale()) return;
      if (areasRes.error) throw new Error(areasRes.error);

      const areas = areasRes.data?.map((a) => ({
        id: a.id,
        name: a.name,
        code: a.code,
        county: a.county,
        geom: a.geom as GeoJSON.Geometry,
        populationTotal: a.populationTotal,
        genderRatio: (a as any).genderRatio ?? null,
        weightedAvgAge: (a as any).weightedAvgAge ?? null,
        riskScore: undefined,
      })) ?? [];
      if (areas.some((a) => !a.county)) throw new Error("區域資料缺少 county 欄位或值，請確認資料庫縣市欄位已填寫");

      if (onlyNeedLightAreas && namesOnly) {
        if (isStale()) return;
        set((prev) => ({
          areas,
          areaOptions: areas.map(({ id, name, code, county }) => ({ id, name, code, county })),
          facilities: prev.facilities,
          tickets: prev.tickets,
          facilityTypes: prev.facilityTypes,
          buildingAges: prev.buildingAges,
          noiseMeasurements: prev.noiseMeasurements,
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
      if (
        countyFilter &&
        stateBeforeFetch.currentCounty === countyFilter &&
        stateBeforeFetch.currentAreaId === targetAreaId &&
        stateBeforeFetch.facilities.length > 0 &&
        stateBeforeFetch.tickets.length > 0
      ) {
        set({ loading: false });
        return;
      }

      const [facilitiesRes, ticketsRes] = await Promise.all([fetchFacilities(), fetchTickets(targetAreaId)]);
      if (isStale()) return;
      if (facilitiesRes.error) throw new Error(facilitiesRes.error);
      if (ticketsRes.error) throw new Error(ticketsRes.error);

      const ticketIds = ticketsRes.data?.map((t) => t.id) ?? [];

      const [riskRes, facilityTypesRes, buildingAgesRes, noiseRes] = await Promise.all([
        fetchAreaRiskSnapshots(),
        fetchFacilityTypes(),
        fetchBuildingAges(),
        fetchNoiseMeasurements()
      ]);
      if (isStale()) return;
      if (facilityTypesRes.error) throw new Error(facilityTypesRes.error);
      if (buildingAgesRes.error) throw new Error(buildingAgesRes.error);
      if (noiseRes.error) throw new Error(noiseRes.error);

      const latestRiskByArea = new Map<string, { score: number; at: number }>();
      riskRes.data?.forEach((r) => {
        const existing = latestRiskByArea.get(r.areaId);
        const computedAtMs = new Date(r._computedAtRaw).getTime();
        if (!existing || computedAtMs > existing.at) {
          latestRiskByArea.set(r.areaId, { score: r.riskScore, at: computedAtMs });
        }
      });

      const typeMeta = new Map<string, { labelZh: string; emoji?: string | null; iconName?: string | null }>();
      facilityTypesRes.data?.forEach((t) => typeMeta.set(t.type, { labelZh: t.labelZh, emoji: t.emoji, iconName: t.iconName }));

      const facilitiesMappedBase = facilitiesRes.data?.map((f) => {
        const meta = typeMeta.get(f.type);
        return {
          id: f.id,
          type: f.type,
          typeLabel: meta?.labelZh ?? undefined,
          typeEmoji: meta?.emoji ?? null,
          typeIconName: meta?.iconName ?? null,
          name: f.name,
          coords: (f.geom as GeoJSON.Point | undefined)?.coordinates as [number, number] | undefined,
          grade: (f.healthGrade as FacilityRecord["grade"]) ?? undefined,
          lastInspection: f.lastInspectionAt ?? undefined,
          incidentsPastYear: undefined,
          latestInspectionNotes: null,
        } satisfies FacilityRecord;
      }) ?? [];

      const tickets = ticketsRes.data?.map((t) => ({
        id: t.id,
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

      const buildingAges = (buildingAgesRes.data ?? [])
        .map((b) => ({
          id: b.id,
          name: b.name,
          coords: (b.geom as GeoJSON.Point | undefined)?.coordinates as [number, number] | undefined,
          ageYears: b.ageYears
        }))
        .filter((b): b is { id: string; name: string; coords: [number, number]; ageYears: number } => !!b.coords);

      const noiseMeasurements = (noiseRes.data ?? [])
        .map((n) => ({
          id: n.id,
          name: n.name,
          coords: (n.geom as GeoJSON.Point | undefined)?.coordinates as [number, number] | undefined,
          morning: n.morning,
          afternoon: n.afternoon,
          night: n.night
        }))
        .filter((n): n is { id: string; name: string; coords: [number, number]; morning: number; afternoon: number; night: number } => !!n.coords);

      const areasWithRisk = areas.map((a) => ({
        ...a,
        riskScore: latestRiskByArea.get(a.id)?.score,
      }));

      const targetArea = areasWithRisk.find((a) => a.id === targetAreaId);
      const filteredAreas = targetArea?.county
        ? areasWithRisk.filter((a) => a.county === targetArea.county)
        : areasWithRisk.filter((a) => a.id === targetAreaId);
      const filteredRisk = (riskRes.data ?? []).filter((r) => filteredAreas.some((a) => a.id === r.areaId));

      // Filter facilities by geometry - only include facilities within the filtered areas
      const facilities = facilitiesMappedBase.filter((f) => {
        if (!f.coords) return false;
        return filteredAreas.some((a) => a.geom && isPointInsideGeometry(f.coords as [number, number], a.geom as GeoJSON.Geometry));
      });

      const ticketEventsRes = await fetchTicketEvents(ticketIds);
      if (isStale()) return;
      if (ticketEventsRes.error) throw new Error(ticketEventsRes.error);

      if (isStale()) return;
      set({
        areas: filteredAreas,
        areaOptions: get().areaOptions.length > 0 ? get().areaOptions : areas.map(({ id, name, code, county }) => ({ id, name, code, county })),
        facilities,
        tickets,
        facilityTypes: facilityTypesRes.data ?? [],
        buildingAges,
        noiseMeasurements,
        currentAreaId: targetAreaId,
        currentCounty: targetArea?.county ?? countyFilter,
        ticketEvents: ticketEventsRes.data ?? [],
        areaRiskSnapshots: filteredRisk,
        loading: false,
        error: undefined,
      });
    } catch (err) {
      if (isStale()) return;
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
