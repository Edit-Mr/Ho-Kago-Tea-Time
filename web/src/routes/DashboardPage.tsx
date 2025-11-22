import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import type GeoJSON from "geojson";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import RiskTrendChart from "../charts/RiskTrendChart";
import TicketByTypeChart from "../charts/TicketByTypeChart";
import FacilityGradePieChart from "../charts/FacilityGradePieChart";
import { Input } from "../components/ui/input";
import { useDataStore } from "../store/dataStore";

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

function DashboardPage() {
  const { areaId } = useParams();
  const navigate = useNavigate();
  const { areas, areaOptions, facilities, tickets, areaRiskSnapshots, loadAll, loading } = useDataStore();
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    // Load names list for search suggestions (lightweight, no geom).
    loadAll({ lightAreas: true, namesOnly: true }).catch(() => {});
  }, [loadAll]);

  useEffect(() => {
    if (areaId) {
      loadAll({ areaId, lightAreas: true }).catch(() => {});
    }
  }, [loadAll, areaId]);

  const selectedArea = useMemo(
    () => areas.find((a) => a.id === areaId) ?? areas[0],
    [areaId, areas]
  );

  // Use areaOptions for display name if selectedArea doesn't have full data
  const displayName = selectedArea?.name ?? areaOptions.find((a) => a.id === areaId)?.name ?? "未選擇區域";

  const areaFacilities = useMemo(
    () => facilities.filter((f) => {
      if (!f.coords || !selectedArea?.geom) return false;
      return isPointInsideGeometry(f.coords, selectedArea.geom as GeoJSON.Geometry);
    }),
    [facilities, selectedArea]
  );

  const areaTickets = useMemo(
    () => tickets.filter((t) => {
      if (!t.coords || !selectedArea?.geom) return false;
      return isPointInsideGeometry(t.coords, selectedArea.geom as GeoJSON.Geometry);
    }),
    [tickets, selectedArea]
  );

  const stats = useMemo(() => {
    const openTickets = areaTickets.filter((t) => t.status !== "completed" && t.status !== "cancelled");
    const overdueTickets = openTickets.filter((t) => t.slaDueAt && new Date(t.slaDueAt).getTime() < Date.now());
    return {
      facilities: areaFacilities.length,
      openTickets: openTickets.length,
      overdueTickets: overdueTickets.length,
    };
  }, [areaFacilities.length, areaTickets]);

  const ticketTypesData = useMemo(() => {
    const counts: Record<string, number> = {};
    areaTickets.forEach((t) => {
      counts[t.type] = (counts[t.type] ?? 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }, [areaTickets]);

  const gradeData = useMemo(() => {
    const counts: Record<"A" | "B" | "C", number> = { A: 0, B: 0, C: 0 };
    areaFacilities.forEach((f) => {
      const grade = f.grade ?? "B";
      counts[grade as keyof typeof counts] += 1;
    });
    return Object.entries(counts).map(([grade, value]) => ({ grade: grade as "A" | "B" | "C", value }));
  }, [areaFacilities]);

  const derivedRisk = useMemo(() => {
    const openTickets = areaTickets.filter((t) => t.status !== "completed" && t.status !== "cancelled");
    const overdueTickets = openTickets.filter((t) => t.slaDueAt && new Date(t.slaDueAt).getTime() < Date.now());
    return Math.min(100, overdueTickets.length * 25 + (openTickets.length - overdueTickets.length) * 10);
  }, [areaTickets]);

  const trendData = useMemo(() => {
    const rows = areaRiskSnapshots.filter((r) => r.areaId === selectedArea?.id);
    if (rows.length === 0) {
      if (!selectedArea?.id) return [];
      return [{ date: new Date().toISOString().slice(0, 10), score: derivedRisk }];
    }
    return rows
      .sort((a, b) => new Date(a._computedAtRaw).getTime() - new Date(b._computedAtRaw).getTime())
      .map((r) => ({ date: r.computedAt, score: r.riskScore ?? derivedRisk }));
  }, [areaRiskSnapshots, selectedArea?.id, derivedRisk]);

  const searchHits = useMemo(() => {
    const source = areaOptions.length ? areaOptions : areas;
    if (!source.length) return [];
    const term = search.trim().toLowerCase();
    const base = term
      ? source.filter((a) => a.name.toLowerCase().includes(term) || (a.code ?? "").toLowerCase().includes(term))
      : source;
    return base;
  }, [areaOptions, areas, search]);

  return (
    <div className="px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div>
            <p className="text-sm text-slate-400">區域儀表板</p>
            <h1 className="text-2xl font-semibold text-slate-50">{displayName}</h1>
          </div>
          <div className="relative w-72">
            <Input
              placeholder="搜尋區域或代碼"
              value={search}
              onFocus={() => setIsSearchOpen(true)}
              onBlur={() => setTimeout(() => setIsSearchOpen(false), 120)}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchHits[0] && navigate(`/dashboard/${searchHits[0].id}`)}
            />
            {isSearchOpen && searchHits.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 rounded-lg border border-slate-800 bg-slate-900/90 shadow-lg text-sm max-h-64 overflow-y-auto">
                {searchHits.map((hit) => (
                  <button
                    key={hit.id}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-slate-800"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (hit.id) {
                        navigate(`/dashboard/${hit.id}`);
                      } else {
                        navigate("/dashboard");
                      }
                      setIsSearchOpen(false);
                    }}
                  >
                    {hit.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <Link to={`/?focus=${areaId ?? "xitun"}`}>
          <Button variant="secondary">返回地圖</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard title="設施數" value={stats.facilities} />
        <SummaryCard title="工單數量" value={stats.openTickets} />
        <SummaryCard title="逾期工單" value={stats.overdueTickets} highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        <Card className="lg:col-span-4">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>風險趨勢 (risk_score)</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskTrendChart data={trendData} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>健康等級分佈</CardTitle>
          </CardHeader>
          <CardContent>
            <FacilityGradePieChart data={gradeData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>工單類型分佈</CardTitle>
          </CardHeader>
          <CardContent>
            <TicketByTypeChart data={ticketTypesData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>逾期最多的單位/類型</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-slate-400">
                  <th className="py-2">單位</th>
                  <th>類型</th>
                  <th>逾期數</th>
                  <th>平均延遲</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {ticketTypesData.map((row) => {
                  const overdueCount = areaTickets.filter(
                    (t) => t.type === row.type && t.slaDueAt && new Date(t.slaDueAt).getTime() < Date.now() && t.status !== "completed" && t.status !== "cancelled"
                  ).length;
                  return (
                    <tr key={row.type}>
                      <td className="py-2 text-slate-100">未指定</td>
                      <td className="text-slate-300">{row.type}</td>
                      <td className="text-amber-200">{overdueCount}</td>
                      <td className="text-slate-300">—</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {loading && <p className="text-xs text-slate-400">載入資料中...</p>}
    </div>
  );
}

function SummaryCard({ title, value, highlight }: { title: string; value: number; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm text-slate-400">{title}</p>
        <p className={`text-3xl font-semibold ${highlight ? "text-red-300" : "text-slate-50"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default DashboardPage;
