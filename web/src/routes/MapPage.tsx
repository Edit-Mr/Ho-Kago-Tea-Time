import { useEffect, useMemo, useRef, useState } from "react";
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

type AreaFeatureProps = {
  id: string;
  name: string;
  risk: number;
  gender_ratio?: number;
  avg_age?: number;
  building_age?: number;
  safety_score?: number;
  noise_morning?: number;
  noise_afternoon?: number;
  noise_night?: number;
};

function isPointInsideGeometry(point: [number, number], geom?: GeoJSON.Geometry): boolean {
  if (!geom) return false;
  if (geom.type === "Polygon") return isPointInPolygon(point, geom.coordinates as GeoJSON.Position[][]);
  if (geom.type === "MultiPolygon") return (geom.coordinates as GeoJSON.Position[][][]).some(poly => isPointInPolygon(point, poly));
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

function distanceSq(a: [number, number], b: [number, number]) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

function MapPage() {
  const { selectedAreaId, selectedFacilityId, selectArea, selectFacility } = useMapStore();
  const [searchValue, setSearchValue] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const toggleRightPanel = useUiStore(s => s.toggleRightPanel);
  const isRightPanelOpen = useUiStore(s => s.isRightPanelOpen);
  const setRightPanelOpen = useUiStore(s => s.setRightPanelOpen);
  const { areas, areaOptions, facilities, tickets, ticketEvents, loading, error, loadAll } = useDataStore();
  const facilityTypesMeta = useDataStore(s => s.facilityTypes);
  const buildingAges = useDataStore(s => s.buildingAges);
  const noiseMeasurements = useDataStore(s => s.noiseMeasurements);
  const viewport = useMapStore(s => s.viewport);
  const backgroundMode = useMapStore(s => s.backgroundMode);
  const noiseTime = useMapStore(s => s.noiseTime);

  // Preload names list for search suggestions
  useEffect(() => {
    loadAll({ lightAreas: true, namesOnly: true }).catch(() => {
      // handled via store
    });
  }, [loadAll]);

  const lastFetchCenterRef = useRef<[number, number] | null>(null);
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch only when we pan outside the currently loaded areas; stay put otherwise to avoid marker flicker.
  useEffect(() => {
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    fetchDebounceRef.current = setTimeout(() => {
      const areaFromCenter = viewport.center as [number, number];
      const insideKnownArea = areas.some(a => a.geom && isPointInsideGeometry(areaFromCenter, a.geom as GeoJSON.Geometry));
      const sameAsLastFetch =
        lastFetchCenterRef.current &&
        distanceSq(lastFetchCenterRef.current, areaFromCenter) < 1e-10;
      if (!insideKnownArea && !sameAsLastFetch && !loading) {
        lastFetchCenterRef.current = areaFromCenter;
        loadAll({ center: areaFromCenter }).catch(() => {
          // error handled via store state
        });
      }
    }, 500);
    return () => {
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.center, areas, loading]);

  // Removed: area selection should not trigger full reload.
  // Data is already loaded by the viewport-based effect above.

  const areaIdByPoint = useMemo(() => {
    const withGeom = areas.filter(a => a.geom);
    return (coords?: [number, number]) => {
      if (!coords) return undefined;
      const hit = withGeom.find(a => isPointInsideGeometry(coords, a.geom as GeoJSON.Geometry));
      return hit?.id;
    };
  }, [areas]);

  const ticketsWithArea = useMemo(
    () =>
      tickets.map(t => {
        // First try to use ticket's own coords
        if (t.coords) {
          return { ...t, areaId: areaIdByPoint(t.coords) };
        }
        // If no coords, try to use the facility's coords
        if (t.facilityId) {
          const facility = facilities.find(f => f.id === t.facilityId);
          if (facility?.coords) {
            return { ...t, areaId: areaIdByPoint(facility.coords) };
          }
        }
        // No coords available
        return { ...t, areaId: undefined };
      }),
    [areaIdByPoint, tickets, facilities]
  );

  const buildingAgesWithArea = useMemo(
    () =>
      buildingAges.map(b => ({
        ...b,
        areaId: areaIdByPoint(b.coords)
      })),
    [areaIdByPoint, buildingAges]
  );

  const avgBuildingAgeByArea = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    buildingAgesWithArea.forEach(b => {
      if (!b.areaId) return;
      const entry = map.get(b.areaId) ?? { sum: 0, count: 0 };
      map.set(b.areaId, { sum: entry.sum + b.ageYears, count: entry.count + 1 });
    });
    const avgMap = new Map<string, number>();
    map.forEach((entry, id) => {
      avgMap.set(id, entry.sum / Math.max(1, entry.count));
    });
    return avgMap;
  }, [buildingAgesWithArea]);

  const noiseWithArea = useMemo(
    () =>
      noiseMeasurements.map(n => ({
        ...n,
        areaId: areaIdByPoint(n.coords)
      })),
    [areaIdByPoint, noiseMeasurements]
  );

  const noiseAverageByArea = useMemo(() => {
    const map = new Map<string, { morning: number; afternoon: number; night: number; count: number }>();
    noiseWithArea.forEach(n => {
      if (!n.areaId) return;
      const existing = map.get(n.areaId) ?? { morning: 0, afternoon: 0, night: 0, count: 0 };
      map.set(n.areaId, {
        morning: existing.morning + n.morning,
        afternoon: existing.afternoon + n.afternoon,
        night: existing.night + n.night,
        count: existing.count + 1
      });
    });
    const avg = new Map<string, { morning: number; afternoon: number; night: number }>();
    map.forEach((val, id) => {
      const denom = Math.max(1, val.count);
      avg.set(id, {
        morning: val.morning / denom,
        afternoon: val.afternoon / denom,
        night: val.night / denom
      });
    });
    return avg;
  }, [noiseWithArea]);

  const safetyScoreByArea = useMemo(() => {
    const map = new Map<string, number>();
    areas.forEach(area => {
      let count = 0;
      facilities.forEach(f => {
        if (!f.coords || !area.geom) return;
        if ((f.type === "cctv" || f.type === "police_station") && isPointInsideGeometry(f.coords, area.geom as GeoJSON.Geometry)) {
          count += 1;
        }
      });
      const pop = area.populationTotal ?? 0;
      const densityScore = pop > 0 ? (count / pop) * 80000 : count * 20;
      map.set(area.id, Math.min(100, densityScore));
    });
    return map;
  }, [areas, facilities]);

  const areaSummaries: AreaSummary[] = useMemo(() => {
    return areas.map(a => {
      const openTickets = ticketsWithArea.filter(t => t.areaId === a.id && t.status !== "completed" && t.status !== "cancelled");
      const overdueTickets = openTickets.filter(t => {
        if (!t.slaDueAt) return false;
        return new Date(t.slaDueAt).getTime() < Date.now();
      });

      // Count facilities by status in this area (pure geometry-based)
      const areaFacilities = facilities.filter(f => {
        if (!f.coords || !a.geom) return false;
        return isPointInsideGeometry(f.coords, a.geom as GeoJSON.Geometry);
      });
      const overdueFacilities = areaFacilities.filter(f => {
        const relatedTicket = tickets.find(t => t.facilityId === f.id);
        if (relatedTicket) {
          const ticketStatus = deriveTicketStatus(relatedTicket);
          return ticketStatus === "overdue";
        }
        // Check if inspection is stale
        if (!f.lastInspection) return true;
        return isStaleInspection(f.lastInspection, 365);
      });
      const inProgressFacilities = areaFacilities.filter(f => {
        const relatedTicket = tickets.find(t => t.facilityId === f.id);
        if (relatedTicket) {
          const ticketStatus = deriveTicketStatus(relatedTicket);
          return ticketStatus !== "overdue"; // in_progress or within_sla
        }
        return false;
      });

      // Risk calculation: weight overdue items heavier
      // Overdue: tickets * 25 + facilities * 15
      // In progress: tickets * 10 + facilities * 5
      const derivedRisk = Math.min(
        100,
        overdueTickets.length * 25 +
        (openTickets.length - overdueTickets.length) * 10 +
        overdueFacilities.length * 15 +
        inProgressFacilities.length * 5
      );

      return {
        id: a.id,
        name: a.name,
        riskScore: derivedRisk,
        facilities: areaFacilities.length,
        openTickets: openTickets.length,
        overdueTickets: overdueTickets.length
      };
    });
  }, [areas, facilities, ticketsWithArea, tickets]);

  const selectedFacility = useMemo(() => {
    const facility = facilities.find(f => f.id === selectedFacilityId);
    if (!facility) return undefined;
    const relatedTicket = tickets.find(t => t.facilityId === facility.id);
    const events = relatedTicket ? ticketEvents.filter(ev => ev.ticketId === relatedTicket.id) : [];
    const timeline = events.map(ev => ({
      label: ev.eventType,
      date: new Date(ev.createdAt).toISOString().slice(0, 10),
      status: ev.eventType === "completed" ? "done" : ev.eventType === "work_started" ? "in_progress" : "pending"
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
      timeline
    } satisfies FacilityCardType;
  }, [facilities, selectedFacilityId, ticketEvents, tickets]);

  const selectedArea = useMemo(() => {
    return areaSummaries.find(a => a.id === selectedAreaId) ?? areaSummaries[0];
  }, [areaSummaries, selectedAreaId]);

  const riskByArea = useMemo(() => {
    const map = new Map<string, number>();
    areaSummaries.forEach(a => map.set(a.id, a.riskScore));
    return map;
  }, [areaSummaries]);

  const geojsonAreas = useMemo<GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, AreaFeatureProps>>(
    () => ({
      type: "FeatureCollection",
      features: areas.map(a => ({
        type: "Feature",
        id: a.id,
        properties: {
          id: a.id,
          name: a.name,
          risk: riskByArea.get(a.id) ?? 0,
          gender_ratio: a.genderRatio ?? undefined,
          avg_age: a.weightedAvgAge ?? undefined,
          building_age: avgBuildingAgeByArea.get(a.id) ?? undefined,
          safety_score: safetyScoreByArea.get(a.id) ?? undefined,
          noise_morning: noiseAverageByArea.get(a.id)?.morning ?? undefined,
          noise_afternoon: noiseAverageByArea.get(a.id)?.afternoon ?? undefined,
          noise_night: noiseAverageByArea.get(a.id)?.night ?? undefined
        },
        geometry: a.geom as GeoJSON.Polygon | GeoJSON.MultiPolygon
      }))
    }),
    [areas, riskByArea, avgBuildingAgeByArea, safetyScoreByArea, noiseAverageByArea]
  );

  const uniqueFacilityTypes = useMemo(() => {
    const metaByType = new Map<string, { type: string; label: string; emoji?: string }>();
    const list = facilityTypesMeta.length
      ? facilityTypesMeta.map(t => ({
          type: t.type,
          label: t.labelZh,
          emoji: t.emoji ?? undefined
        }))
      : facilities.map(f => ({
          type: f.type,
          label: f.typeLabel ?? f.type,
          emoji: f.typeEmoji ?? undefined
        }));

    list.forEach(item => {
      if (!metaByType.has(item.type)) {
        metaByType.set(item.type, item);
      }
    });
    return Array.from(metaByType.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [facilityTypesMeta, facilities]);

  const mapFacilities = useMemo(
    () =>
      facilities
        .filter(f => f.coords)
        .map(f => {
          const relatedTicket = tickets.find(t => t.facilityId === f.id);
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
            iconName: f.typeIconName ?? "MapPin"
          };
        }),
    [facilities, tickets]
  );

  const mapTickets = useMemo(
    () =>
      tickets
        .filter(t => t.coords)
        .map(t => ({
          id: t.id,
          status: deriveTicketStatus(t) ?? "open",
          coordinates: t.coords as [number, number]
        })),
    [tickets]
  );

  const buildingAgePoints = useMemo(
    () =>
      buildingAgesWithArea
        .filter(b => b.coords)
        .map(b => ({
          id: b.id,
          name: b.name,
          ageYears: b.ageYears,
          coordinates: b.coords as [number, number]
        })),
    [buildingAgesWithArea]
  );

  const noisePoints = useMemo(
    () =>
      noiseWithArea
        .filter(n => n.coords)
        .map(n => ({
          id: n.id,
          name: n.name,
          morning: n.morning,
          afternoon: n.afternoon,
          night: n.night,
          coordinates: n.coords as [number, number]
        })),
    [noiseWithArea]
  );

  const searchHits = useMemo(() => {
    const source = areaOptions.length ? areaOptions : areas;
    if (!source.length) return [];
    const term = searchValue.trim().toLowerCase();
    return term ? source.filter(a => a.name.toLowerCase().includes(term) || (a.code ?? "").toLowerCase().includes(term)) : source;
  }, [areaOptions, areas, searchValue]);

  const handleSelectArea = (areaId: string) => {
    selectArea(areaId);
    selectFacility(undefined);
    setRightPanelOpen(true);
    setIsSearchOpen(false);
  };

  const handleSearch = () => {
    const hit = searchHits[0];
    if (hit?.id) handleSelectArea(hit.id);
  };

  return (
    <div className="relative w-full h-[calc(100vh-82px)]">
      <div className="absolute inset-0">
        <MapView
          areasGeoJson={geojsonAreas}
          facilities={mapFacilities}
          tickets={mapTickets}
          buildingAges={buildingAgePoints}
          noisePoints={noisePoints}
          backgroundMode={backgroundMode}
          noiseTime={noiseTime}
          onAreaClick={id => {
            selectArea(id);
            selectFacility(undefined);
            useUiStore.getState().setRightPanelOpen(true);
          }}
          onFacilityClick={id => {
            selectFacility(id);
            useUiStore.getState().setRightPanelOpen(true);
          }}
          onTicketClick={id => {
            // eslint-disable-next-line no-console
            console.log("Clicked ticket", id);
          }}
        />
      </div>

          <div className="absolute top-4 left-4 space-y-3 w-80 z-10 max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
            {error && (
              <Card className="border-red-500/40 bg-red-500/10">
                <CardHeader className="flex items-center justify-between">
                  <CardTitle className="text-red-100">資料載入失敗</CardTitle>
                  <Button variant="secondary" onClick={() => loadAll()}>
                    <RefreshCcw className="h-4 w-4" aria-hidden />
                  </Button>
                </CardHeader>
                <CardContent className="text-sm text-red-100">{error}</CardContent>
              </Card>
        )}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-lg backdrop-blur space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="搜尋區域或代碼"
                value={searchValue}
                onFocus={() => setIsSearchOpen(true)}
                onBlur={() => setTimeout(() => setIsSearchOpen(false), 120)}
                onChange={e => {
                  setSearchValue(e.target.value);
                  setIsSearchOpen(true);
                }}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
              {isSearchOpen && searchHits.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 rounded-lg border border-slate-800 bg-slate-900/90 shadow-lg text-sm max-h-64 overflow-y-auto z-20">
                  {searchHits.map(hit => (
                    <button
                      key={hit.id}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-slate-800"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => handleSelectArea(hit.id)}
                    >
                      {hit.name}
                      {hit.code ? <span className="ml-2 text-xs text-slate-500">{hit.code}</span> : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleSearch}>搜尋</Button>
          </div>
        </div>
        <LayerToggles facilityTypes={uniqueFacilityTypes} />
        <PolicyExperimentCard />
      </div>

      {isRightPanelOpen && (
        <div className="absolute top-4 right-4 w-[360px] overflow-y-auto space-y-3 z-10 max-h-full pb-6">
          {loading ? (
            <>
              <InfoSkeleton />
              <InfoSkeleton />
            </>
          ) : selectedFacility ? (
            <FacilityCard facility={selectedFacility} />
          ) : selectedArea ? (
            <AreaCard area={selectedArea} />
          ) : null}
          {!loading && selectedAreaId && !selectedFacility && (
            <NearbyIssues tickets={ticketsWithArea} areas={areas} selectedAreaId={selectedAreaId} />
          )}
        </div>
      )}

      <button
        onClick={toggleRightPanel}
        className={`absolute top-4 z-20 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-slate-200 inline-flex items-center gap-2 transition-all ${
          isRightPanelOpen ? "right-[24rem]" : "right-4"
        }`}
        aria-label={isRightPanelOpen ? "Hide info panel" : "Show info panel"}
      >
        {isRightPanelOpen ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        {isRightPanelOpen ? "Hide info" : "Show info"}
      </button>

      <TicketFormDrawer facilityId={selectedFacilityId} facilities={facilities} areas={areas} />
    </div>
  );
}

function InfoSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 animate-pulse space-y-3">
      <div className="h-4 w-32 rounded bg-slate-700/60" />
      <div className="h-6 w-48 rounded bg-slate-700/50" />
      <div className="h-[1px] w-full bg-slate-800" />
      <div className="space-y-2">
        <div className="h-6 w-full rounded bg-slate-700/40" />
        <div className="h-6 w-5/6 rounded bg-slate-700/40" />
        <div className="h-6 w-2/3 rounded bg-slate-700/40" />
      </div>
    </div>
  );
}

function NearbyIssues({ tickets, areas, selectedAreaId }: { tickets: Array<TicketRecord & { areaId?: string }>; areas: AreaRecord[]; selectedAreaId: string }) {
  const openIssues = tickets
    .filter(t => t.status !== "completed" && t.status !== "cancelled")
    .filter(t => t.areaId === selectedAreaId)
    .slice(0, 6);

  if (openIssues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>附近事件</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">{selectedAreaId ? "此區域目前沒有開啟中的通報或工單。" : "目前沒有開啟中的通報或工單。"}</CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>附近事件</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {openIssues.map(issue => (
          <div key={issue.id} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2">
            <div>
              <p className="text-sm text-slate-100">{issue.description ?? issue.type}</p>
              <p className="text-xs text-slate-500">{areas.find(a => a.id === issue.areaId)?.name ?? "未知區域"}</p>
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

function deriveFacilityStatus(facility: { lastInspection?: string | undefined; slaDue?: string | undefined }, relatedTicket: TicketRecord | undefined): MaintenanceStatus {
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
