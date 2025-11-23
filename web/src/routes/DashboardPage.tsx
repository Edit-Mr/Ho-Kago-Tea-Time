import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import type GeoJSON from "geojson";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import RiskTrendChart from "../charts/RiskTrendChart";
import TicketByTypeChart from "../charts/TicketByTypeChart";
import FacilityGradePieChart from "../charts/FacilityGradePieChart";
import { Input } from "../components/ui/input";

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
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const demoAreas = useMemo(
    () => [
      { id: "hsinchu-east", name: "竹市東區", geom: undefined, riskScore: 68, code: "300A", county: "新竹市" },
      { id: "hsinchu-north", name: "竹市北區", geom: undefined, riskScore: 45, code: "300B", county: "新竹市" },
      { id: "hsinchu-xiangshan", name: "竹市香山", geom: undefined, riskScore: 52, code: "300C", county: "新竹市" },
      { id: "taoyuan-zhongli", name: "桃園中壢", geom: undefined, riskScore: 60, code: "320A", county: "桃園市" },
      { id: "taoyuan-taoyuan", name: "桃園桃園區", geom: undefined, riskScore: 58, code: "320B", county: "桃園市" }
    ],
    []
  );

  const demoFacilities = useMemo(
    () => [
      { id: "f1", name: "關新公園", type: "park", grade: "B", areaId: "hsinchu-east", lastInspection: "2024-11-01" },
      { id: "f2", name: "光復路路燈 #12", type: "street_light", grade: "A", areaId: "hsinchu-east", lastInspection: "2024-11-10" },
      { id: "f3", name: "經國派出所", type: "police_station", grade: "A", areaId: "hsinchu-north", lastInspection: "2024-11-05" },
      { id: "f4", name: "青草湖步道", type: "road", grade: "C", areaId: "hsinchu-xiangshan", lastInspection: "2024-10-12" },
      { id: "f5", name: "陽明公園", type: "park", grade: "A", areaId: "hsinchu-east", lastInspection: "2024-10-25" },
      { id: "f6", name: "科園路監視器 #3", type: "cctv", grade: "A", areaId: "hsinchu-east", lastInspection: "2024-10-30" },
      { id: "f7", name: "新竹火車站前路燈 #8", type: "street_light", grade: "B", areaId: "hsinchu-north", lastInspection: "2024-11-02" },
      { id: "f8", name: "中壢中央公園", type: "park", grade: "B", areaId: "taoyuan-zhongli", lastInspection: "2024-10-15" },
      { id: "f9", name: "桃園藝文特區路燈 #21", type: "street_light", grade: "C", areaId: "taoyuan-taoyuan", lastInspection: "2024-10-05" },
      { id: "f10", name: "中壢派出所", type: "police_station", grade: "A", areaId: "taoyuan-zhongli", lastInspection: "2024-11-08" },
      { id: "f11", name: "元培醫院旁人行道", type: "road", grade: "C", areaId: "hsinchu-east", lastInspection: "2024-10-18" },
      { id: "f12", name: "香山海岸公園", type: "park", grade: "C", areaId: "hsinchu-xiangshan", lastInspection: "2024-09-28" },
      { id: "f13", name: "桃園國民運動中心", type: "building", grade: "B", areaId: "taoyuan-taoyuan", lastInspection: "2024-10-20" }
    ],
    []
  );

  const demoTickets = useMemo(
    () => [
      { id: "t1", areaId: "hsinchu-east", type: "路燈故障", status: "open", severity: 2, slaDueAt: "2024-12-05", createdAt: "2024-11-15" },
      { id: "t2", areaId: "hsinchu-east", type: "路燈故障", status: "in_progress", severity: 2, slaDueAt: "2024-12-01", createdAt: "2024-11-10" },
      { id: "t3", areaId: "hsinchu-east", type: "路燈故障", status: "assigned", severity: 1, slaDueAt: "2024-12-07", createdAt: "2024-11-18" },
      { id: "t4", areaId: "hsinchu-north", type: "人行道破損", status: "open", severity: 3, slaDueAt: "2024-11-28", createdAt: "2024-11-08" },
      { id: "t5", areaId: "hsinchu-xiangshan", type: "步道坑洞", status: "completed", severity: 1, slaDueAt: "2024-11-20", createdAt: "2024-10-30" },
      { id: "t6", areaId: "hsinchu-east", type: "監視器畫面模糊", status: "assigned", severity: 1, slaDueAt: "2024-12-03", createdAt: "2024-11-18" },
      { id: "t7", areaId: "taoyuan-zhongli", type: "公園照明不足", status: "in_progress", severity: 2, slaDueAt: "2024-12-08", createdAt: "2024-11-12" },
      { id: "t8", areaId: "taoyuan-taoyuan", type: "路燈故障", status: "open", severity: 2, slaDueAt: "2024-12-02", createdAt: "2024-11-14" },
      { id: "t9", areaId: "taoyuan-zhongli", type: "路燈故障", status: "open", severity: 1, slaDueAt: "2024-12-18", createdAt: "2024-11-16" },
      { id: "t10", areaId: "taoyuan-taoyuan", type: "路燈故障", status: "in_progress", severity: 2, slaDueAt: "2024-12-12", createdAt: "2024-11-11" },
      { id: "t11", areaId: "taoyuan-zhongli", type: "派出所外牆滲水", status: "open", severity: 1, slaDueAt: "2024-12-20", createdAt: "2024-11-05" }
    ],
    []
  );

  const demoRiskSnapshots = useMemo(
    () => [
      { areaId: "hsinchu-east", computedAt: "2024-09-01", riskScore: 58, _computedAtRaw: "2024-09-01" },
      { areaId: "hsinchu-east", computedAt: "2024-10-01", riskScore: 62, _computedAtRaw: "2024-10-01" },
      { areaId: "hsinchu-east", computedAt: "2024-11-15", riskScore: 68, _computedAtRaw: "2024-11-15" },
      { areaId: "hsinchu-north", computedAt: "2024-11-15", riskScore: 45, _computedAtRaw: "2024-11-15" },
      { areaId: "hsinchu-xiangshan", computedAt: "2024-10-01", riskScore: 48, _computedAtRaw: "2024-10-01" },
      { areaId: "hsinchu-xiangshan", computedAt: "2024-11-15", riskScore: 52, _computedAtRaw: "2024-11-15" },
      { areaId: "taoyuan-zhongli", computedAt: "2024-09-15", riskScore: 55, _computedAtRaw: "2024-09-15" },
      { areaId: "taoyuan-zhongli", computedAt: "2024-11-01", riskScore: 58, _computedAtRaw: "2024-11-01" },
      { areaId: "taoyuan-zhongli", computedAt: "2024-11-15", riskScore: 60, _computedAtRaw: "2024-11-15" },
      { areaId: "taoyuan-taoyuan", computedAt: "2024-10-15", riskScore: 56, _computedAtRaw: "2024-10-15" },
      { areaId: "taoyuan-taoyuan", computedAt: "2024-11-15", riskScore: 58, _computedAtRaw: "2024-11-15" }
    ],
    []
  );

  const selectedArea = useMemo(
    () => demoAreas.find((a) => a.id === areaId) ?? demoAreas[0],
    [areaId, demoAreas]
  );

  // Use areaOptions for display name if selectedArea doesn't have full data
  const displayName = selectedArea?.name ?? "未選擇區域";

  const areaFacilities = useMemo(
    () => demoFacilities.filter((f) => f.areaId === selectedArea?.id),
    [demoFacilities, selectedArea?.id]
  );

  const areaTickets = useMemo(
    () => demoTickets.filter((t) => t.areaId === selectedArea?.id),
    [demoTickets, selectedArea?.id]
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
    const rows = demoRiskSnapshots.filter((r) => r.areaId === selectedArea?.id);
    if (rows.length === 0) {
      if (!selectedArea?.id) return [];
      return [{ date: new Date().toISOString().slice(0, 10), score: derivedRisk }];
    }
    return rows
      .sort((a, b) => new Date(a._computedAtRaw).getTime() - new Date(b._computedAtRaw).getTime())
      .map((r) => ({ date: r.computedAt, score: r.riskScore ?? derivedRisk }));
  }, [demoRiskSnapshots, selectedArea?.id, derivedRisk]);

  const searchHits = useMemo(() => {
    const source = demoAreas;
    const term = search.trim().toLowerCase();
    return term
      ? source.filter((a) => a.name.toLowerCase().includes(term) || (a.code ?? "").toLowerCase().includes(term))
      : source;
  }, [demoAreas, search]);

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

      <p className="text-xs text-slate-400">使用 demo 資料展示圖表</p>
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
