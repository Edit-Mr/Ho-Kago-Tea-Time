import { create } from "zustand";
import type GeoJSON from "geojson";
import { fetchAreaRiskSnapshots, fetchAreas, fetchFacilities, fetchFacilityInspections, fetchFacilityTypes, fetchMissions, fetchTicketEvents, fetchTickets } from "../lib/api";

export type AreaRecord = {
  id: string;
  name: string;
  code?: string | null;
  geom: GeoJSON.Geometry;
  populationTotal?: number | null;
  riskScore?: number;
};

export type FacilityRecord = {
  id: string;
  areaId?: string | null;
  type: string;
  typeLabel?: string;
  typeEmoji?: string | null;
  name: string;
  iconEmoji?: string | null;
  coords?: [number, number];
  grade?: "A" | "B" | "C";
  lastInspection?: string;
  incidentsPastYear?: number;
  latestInspectionNotes?: string | null;
  hasOpenTicket?: boolean;
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

export type MissionRecord = {
  id: string;
  areaId?: string | null;
  facilityId?: string | null;
  title: string;
  description?: string | null;
  status: string;
  type?: string | null;
  dueAt?: string | null;
};

type DataState = {
  areas: AreaRecord[];
  facilities: FacilityRecord[];
  tickets: TicketRecord[];
  ticketEvents: TicketEventRecord[];
  missions: MissionRecord[];
  areaRiskSnapshots: Array<{ areaId: string; riskScore: number; computedAt: string; _computedAtRaw: string }>;
  facilityTypes: Array<{ type: string; labelZh: string; emoji?: string | null }>;
  loading: boolean;
  error?: string;
  loadAll: () => Promise<void>;
};

export const useDataStore = create<DataState>((set) => ({
  areas: [],
  facilities: [],
  tickets: [],
  ticketEvents: [],
  missions: [],
  areaRiskSnapshots: [],
  facilityTypes: [],
  loading: false,
  error: undefined,
  loadAll: async () => {
    set({ loading: true, error: undefined });
    try {
      const [areasRes, riskRes, facilitiesRes, inspectionsRes, ticketsRes, ticketEventsRes, missionsRes, facilityTypesRes] = await Promise.all([
        fetchAreas(),
        fetchAreaRiskSnapshots(),
        fetchFacilities(),
        fetchFacilityInspections(),
        fetchTickets(),
        fetchTicketEvents(),
        fetchMissions(),
        fetchFacilityTypes(),
      ]);
      if (areasRes.error) throw new Error(areasRes.error);
      if (facilitiesRes.error) throw new Error(facilitiesRes.error);
      if (ticketsRes.error) throw new Error(ticketsRes.error);
      if (facilityTypesRes.error) throw new Error(facilityTypesRes.error);

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

      const typeMeta = new Map<string, { labelZh: string; emoji?: string | null }>();
      facilityTypesRes.data?.forEach((t) => typeMeta.set(t.type, { labelZh: t.labelZh, emoji: t.emoji }));

      const facilities = facilitiesRes.data?.map((f) => {
        const latestInspection = latestInspectionByFacility.get(f.id);
        const meta = typeMeta.get(f.type);
        return {
          id: f.id,
          areaId: f.areaId,
          type: f.type,
          typeLabel: meta?.labelZh ?? undefined,
          typeEmoji: meta?.emoji ?? null,
          name: f.name,
          iconEmoji: f.iconEmoji ?? meta?.emoji ?? null,
          coords: (f.geom as GeoJSON.Point | undefined)?.coordinates as [number, number] | undefined,
          grade: (f.healthGrade as FacilityRecord["grade"]) ?? undefined,
          lastInspection: latestInspection?.inspectedAt ?? f.lastInspectionAt ?? undefined,
          incidentsPastYear: latestInspection?.incidentCount ?? undefined,
          latestInspectionNotes: latestInspection?.notes ?? null,
          hasOpenTicket: f.hasOpenTicket ?? false,
        } satisfies FacilityRecord;
      }) ?? [];

      const areas = areasRes.data?.map((a) => ({
        id: a.id,
        name: a.name,
        code: a.code,
        geom: a.geom as GeoJSON.Geometry,
        populationTotal: a.populationTotal,
        riskScore: latestRiskByArea.get(a.id)?.score,
      })) ?? [];

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

      set({
        areas,
        facilities,
        tickets,
        facilityTypes: facilityTypesRes.data ?? [],
        ticketEvents: ticketEventsRes.data ?? [],
        missions: missionsRes.data ?? [],
        areaRiskSnapshots: riskRes.data ?? [],
        loading: false,
        error: undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      set({ error: message, loading: false });
    }
  },
}));
