import { useEffect, useMemo, useState } from "react";
import type GeoJSON from "geojson";
import MapView from "../components/MapView";
import LayerToggles from "../components/LayerToggles";
import FacilityCard, { type Facility as FacilityCardType } from "../components/FacilityCard";
import AreaCard, { type AreaSummary } from "../components/AreaCard";
import TicketFormDrawer from "../components/TicketFormDrawer";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Eye, EyeOff, AlertTriangle, Clock3, RefreshCcw } from "lucide-react";
import { useMapStore } from "../store/mapStore";
import { useUiStore } from "../store/uiStore";
import PolicyExperimentCard from "../components/PolicyExperimentCard";
import { useDataStore, type AreaRecord, type TicketRecord } from "../store/dataStore";
import { deriveTicketStatus } from "../utils/tickets";
import { type FacilityStatusFilter } from "../store/mapStore";

function MapPage() {
  const { selectedAreaId, selectedFacilityId, selectArea, selectFacility } = useMapStore();
  const [searchValue, setSearchValue] = useState("");
  const toggleRightPanel = useUiStore((s) => s.toggleRightPanel);
  const isRightPanelOpen = useUiStore((s) => s.isRightPanelOpen);
  const { areas, facilities, tickets, ticketEvents, loading, error, loadAll } = useDataStore();
  const facilityTypesMeta = useDataStore((s) => s.facilityTypes);

  useEffect(() => {
    loadAll().catch(() => {
      // error handled via store state
    });
  }, [loadAll]);

  const areaSummaries: AreaSummary[] = useMemo(() => {
    return areas.map((a) => {
      const openTickets = tickets.filter((t) => t.areaId === a.id && t.status !== "completed" && t.status !== "cancelled");
      const overdueTickets = openTickets.filter((t) => {
        if (!t.slaDueAt) return false;
        return new Date(t.slaDueAt).getTime() < Date.now();
      });
      return {
        id: a.id,
        name: a.name,
        riskScore: a.riskScore ?? 0,
        facilities: facilities.filter((f) => f.areaId === a.id).length,
        openTickets: openTickets.length,
        overdueTickets: overdueTickets.length,
      };
    });
  }, [areas, facilities, tickets]);

  const selectedFacility = useMemo(() => {
    const facility = facilities.find((f) => f.id === selectedFacilityId);
    if (!facility) return undefined;
    const relatedTicket = tickets.find((t) => t.facilityId === facility.id);
    const events = relatedTicket ? ticketEvents.filter((ev) => ev.ticketId === relatedTicket.id) : [];
    const timeline = events.map((ev) => ({
      label: ev.eventType,
      date: new Date(ev.createdAt).toISOString().slice(0, 10),
      status: ev.eventType === "completed" ? "done" : ev.eventType === "work_started" ? "in_progress" : "pending",
    })) as FacilityCardType["timeline"];
    return {
      id: facility.id,
      name: facility.name,
      type: facility.type,
      address: undefined,
      grade: (facility.grade ?? "B") as FacilityCardType["grade"],
      lastInspection: facility.lastInspection?.slice(0, 10) ?? "—",
      incidentsPastYear: facility.incidentsPastYear ?? 0,
      pendingIssues: facility.latestInspectionNotes ? [facility.latestInspectionNotes] : undefined,
      slaDue: relatedTicket?.slaDueAt ?? undefined,
      ticketStatus: deriveTicketStatus(relatedTicket),
      timeline,
    } satisfies FacilityCardType;
  }, [facilities, selectedFacilityId, ticketEvents, tickets]);

  const selectedArea = useMemo(() => {
    return areaSummaries.find((a) => a.id === selectedAreaId) ?? areaSummaries[0];
  }, [areaSummaries, selectedAreaId]);

  const geojsonAreas = useMemo<GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, { id: string; name: string; risk: number }>>(
    () => ({
      type: "FeatureCollection",
      features: areas.map((a) => ({
        type: "Feature",
        id: a.id,
        properties: { id: a.id, name: a.name, risk: a.riskScore ?? 0 },
        geometry: a.geom as GeoJSON.Polygon | GeoJSON.MultiPolygon,
      })),
    }),
    [areas]
  );

  const uniqueFacilityTypes = useMemo(() => {
    const metaByType = new Map<string, { type: string; label: string; emoji?: string }>();
    const list = facilityTypesMeta.length
      ? facilityTypesMeta.map((t) => ({
          type: t.type,
          label: t.labelZh,
          emoji: t.emoji ?? undefined,
        }))
      : facilities.map((f) => ({
          type: f.type,
          label: f.typeLabel ?? f.type,
          emoji: f.typeEmoji ?? undefined,
        }));

    list.forEach((item) => {
      if (!metaByType.has(item.type)) {
        metaByType.set(item.type, item);
      }
    });
    return Array.from(metaByType.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [facilityTypesMeta, facilities]);

  const mapFacilities = useMemo(
    () =>
      facilities
        .filter((f) => f.coords)
        .map((f) => {
          const relatedTicket = tickets.find((t) => t.facilityId === f.id);
          const maintenanceStatus = deriveFacilityStatus(f, relatedTicket);
          return {
            id: f.id,
            name: f.name,
            type: f.type,
            typeLabel: f.typeLabel ?? f.type,
            maintenanceStatus,
            grade: (f.grade ?? "B") as FacilityCardType["grade"],
            lastInspection: f.lastInspection?.slice(0, 10) ?? "—",
            incidentsPastYear: f.incidentsPastYear ?? 0,
            coordinates: f.coords as [number, number],
            iconEmoji: f.iconEmoji ?? f.typeEmoji ?? undefined,
          };
        }),
    [facilities, tickets]
  );

  const mapTickets = useMemo(
    () =>
      tickets
        .filter((t) => t.coords)
        .map((t) => ({
          id: t.id,
          status: deriveTicketStatus(t) ?? "open",
          coordinates: t.coords as [number, number],
        })),
    [tickets]
  );

  const handleSearch = () => {
    const hit = areaSummaries.find((a) => a.name.includes(searchValue) || a.id === searchValue || a.name.toLowerCase().includes(searchValue.toLowerCase()));
    if (hit) selectArea(hit.id);
  };

  return (
    <div className="relative w-full h-[calc(100vh-82px)]">
      <div className="absolute inset-0">
        <MapView
          areasGeoJson={geojsonAreas}
          facilities={mapFacilities}
          tickets={mapTickets}
          onAreaClick={(id) => {
            selectArea(id);
            selectFacility(undefined);
            useUiStore.getState().setRightPanelOpen(true);
          }}
          onFacilityClick={(id) => {
            selectFacility(id);
            useUiStore.getState().setRightPanelOpen(true);
          }}
          onTicketClick={(id) => {
            // eslint-disable-next-line no-console
            console.log("Clicked ticket", id);
          }}
        />
      </div>

      <div className="absolute top-4 left-4 space-y-3 w-80 z-10 max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 flex gap-2 shadow-lg backdrop-blur">
          <Input
            placeholder="輸入地址或區域搜尋"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch}>搜尋</Button>
        </div>
        <LayerToggles facilityTypes={uniqueFacilityTypes} />
        <PolicyExperimentCard />
        {error && (
          <Card className="border-red-500/40 bg-red-500/10">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-red-100">資料載入失敗</CardTitle>
              <Button variant="secondary" onClick={loadAll}>
                <RefreshCcw className="h-4 w-4" aria-hidden />
              </Button>
            </CardHeader>
            <CardContent className="text-sm text-red-100">
              {error}
            </CardContent>
          </Card>
        )}
      </div>

      {isRightPanelOpen && (
        <div className="absolute top-4 right-4 bottom-4 w-[360px] overflow-y-auto space-y-3 z-10">
          {selectedFacility ? (
            <FacilityCard facility={selectedFacility} />
          ) : selectedArea ? (
            <AreaCard area={selectedArea} />
          ) : null}
          <NearbyIssues tickets={tickets} areas={areas} selectedAreaId={selectedAreaId} />
        </div>
      )}

      <button
        onClick={toggleRightPanel}
        className={`absolute top-4 z-20 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-slate-200 inline-flex items-center gap-2 transition-all ${isRightPanelOpen ? "right-[24rem]" : "right-4"
          }`}
        aria-label={isRightPanelOpen ? "Hide info panel" : "Show info panel"}
      >
        {isRightPanelOpen ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        {isRightPanelOpen ? "Hide info" : "Show info"}
      </button>

      <TicketFormDrawer
        facilityId={selectedFacilityId}
        facilities={facilities}
        areas={areas}
      />

      {loading && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm grid place-items-center text-slate-200 text-sm z-20">
          載入資料中...
        </div>
      )}
    </div>
  );
}

function NearbyIssues({ tickets, areas, selectedAreaId }: { tickets: TicketRecord[]; areas: AreaRecord[]; selectedAreaId: string }) {
  const openIssues = tickets
    .filter((t) => t.status !== "completed" && t.status !== "cancelled")
    .filter((t) => t.areaId === selectedAreaId)
    .slice(0, 6);
  
  if (openIssues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>附近事件</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">
          {selectedAreaId ? "此區域目前沒有開啟中的通報或工單。" : "目前沒有開啟中的通報或工單。"}
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>附近事件</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {openIssues.map((issue) => (
          <div key={issue.id} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2">
            <div>
              <p className="text-sm text-slate-100">{issue.description ?? issue.type}</p>
              <p className="text-xs text-slate-500">
                {areas.find((a) => a.id === issue.areaId)?.name ?? "未知區域"}
              </p>
            </div>
            <Badge variant={deriveTicketStatus(issue) === "overdue" ? "danger" : "warning"}>
              {deriveTicketStatus(issue) === "overdue" ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> : <Clock3 className="h-3.5 w-3.5" aria-hidden />}
              <span className="ml-1">{deriveTicketStatus(issue) === "overdue" ? "逾期" : "進行中"}</span>
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default MapPage;

type MaintenanceStatus = keyof FacilityStatusFilter;

function deriveFacilityStatus(facility: FacilityCardType & { slaDue?: string | undefined }, relatedTicket: TicketRecord | undefined): MaintenanceStatus {
  if (relatedTicket) {
    const derived = deriveTicketStatus(relatedTicket);
    if (derived === "overdue") return "overdue";
    return "in_progress";
  }
  if (!facility.lastInspection || isStaleInspection(facility.lastInspection, 365)) {
    return "overdue";
  }
  return "safe";
}

function isStaleInspection(lastInspection: string, staleAfterDays: number) {
  const inspectedAt = new Date(lastInspection).getTime();
  if (Number.isNaN(inspectedAt)) return true;
  const diffDays = (Date.now() - inspectedAt) / (1000 * 60 * 60 * 24);
  return diffDays > staleAfterDays;
}
