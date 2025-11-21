import { useMapStore, type MapStore, type Scenario } from "../store/mapStore";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

type LayerKey = keyof MapStore["activeLayers"];
type LayerTogglesProps = {
  facilityTypes: Array<{ type: string; label: string; emoji?: string }>;
};

const scenarioPresets: Array<{ id: Scenario; title: string; description: string; highlights: string[] }> = [
  {
    id: "home_safety",
    title: "我家附近安全嗎？",
    description: "顯示路燈、坑洞、事故點與近期通報，適合居民查看周遭。",
    highlights: ["路燈故障", "坑洞", "近期通報點"],
  },
  {
    id: "official_priority",
    title: "官員優先處理區域",
    description: "風險模型：老化 × 人口 × 通報量，搭配逾期工單聚落。",
    highlights: ["風險熱區", "逾期工單", "事故史"],
  },
  {
    id: "aging_infra",
    title: "老舊設施 / 逾期維護",
    description: "找出久未檢查、維修逾期的設施，搭配人口弱勢區。",
    highlights: ["維修逾期", "弱勢人口", "檢查間隔"],
  },
  {
    id: "incident_hotspots",
    title: "事故熱點",
    description: "近期事故 + 通報熱點，協助安排快閃修補或封鎖。",
    highlights: ["事故點", "通報潮", "臨時措施"],
  },
  {
    id: "custom",
    title: "自訂圖層",
    description: "自由開關圖層，適合展示或研究。",
    highlights: ["自訂視圖"],
  },
];

const layerLabels: Record<LayerKey, string> = {
  areas: "區域風險多邊形",
  facilities: "設施圖示 (公園/路燈)",
  tickets: "工單票證",
  heatmap: "風險熱區",
};

function LayerToggles({ facilityTypes }: LayerTogglesProps) {
  const activeLayers = useMapStore((s) => s.activeLayers);
  const toggleLayer = useMapStore((s) => s.toggleLayer);
  const selectedScenario = useMapStore((s) => s.selectedScenario);
  const setScenario = useMapStore((s) => s.setScenario);
  const facilityTypeFilter = useMapStore((s) => s.facilityTypeFilter);
  const toggleFacilityType = useMapStore((s) => s.toggleFacilityType);
  const resetFacilityTypeFilter = useMapStore((s) => s.resetFacilityTypeFilter);
  const facilityStatusFilter = useMapStore((s) => s.facilityStatusFilter);
  const toggleFacilityStatus = useMapStore((s) => s.toggleFacilityStatus);

  return (
    <Card>
      <CardHeader>
        <CardTitle>圖層開關</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <p className="text-xs text-slate-400">情境模式 / Scenario presets</p>
          <div className="space-y-2">
            {scenarioPresets.map((scenario) => {
              const isActive = selectedScenario === scenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => setScenario(scenario.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition hover:border-brand-500/60 ${
                    isActive ? "border-brand-400/80 bg-brand-400/10" : "border-slate-800 bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-50">{scenario.title}</span>
                    {isActive && <span className="text-[10px] text-brand-100">使用中</span>}
                  </div>
                  <p className="text-xs text-slate-400 leading-snug">{scenario.description}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {scenario.highlights.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] rounded-full bg-slate-800/80 px-2 py-0.5 text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        {Object.entries(activeLayers).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <div className="text-sm text-slate-200">{layerLabels[key as LayerKey]}</div>
            <Button variant={value ? "primary" : "secondary"} onClick={() => toggleLayer(key as LayerKey)}>
              {value ? "顯示中" : "已關閉"}
            </Button>
          </div>
        ))}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">設施狀態</p>
            <Button
              variant="secondary"
              onClick={() => {
                toggleFacilityStatus("safe", true);
                toggleFacilityStatus("in_progress", true);
                toggleFacilityStatus("overdue", true);
              }}
            >
              全部
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              { id: "safe", label: "已檢查安全", tone: "emerald" },
              { id: "in_progress", label: "修復中", tone: "amber" },
              { id: "overdue", label: "逾期/未檢測", tone: "red" },
            ].map(({ id, label, tone }) => {
              const active = facilityStatusFilter[id as keyof typeof facilityStatusFilter];
              const colors =
                tone === "emerald"
                  ? active
                    ? "bg-emerald-500/20 text-emerald-100 border border-emerald-500/40"
                    : "bg-slate-800 text-slate-200 border border-slate-700"
                  : tone === "amber"
                  ? active
                    ? "bg-amber-500/20 text-amber-100 border border-amber-500/40"
                    : "bg-slate-800 text-slate-200 border border-slate-700"
                  : active
                  ? "bg-red-500/20 text-red-100 border border-red-500/40"
                  : "bg-slate-800 text-slate-200 border border-slate-700";
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleFacilityStatus(id as keyof typeof facilityStatusFilter)}
                  className={`px-2 py-1 rounded-full text-[11px] transition ${colors}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">設施類型</p>
            <Button variant="secondary" onClick={resetFacilityTypeFilter}>
              全部
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {facilityTypes.map(({ type, label, emoji }) => {
              const active = facilityTypeFilter.length === 0 || facilityTypeFilter.includes(type);
              const text = `${emoji ? `${emoji} ` : ""}${label}`;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleFacilityType(type)}
                  className={`px-2 py-1 rounded-full text-[11px] border transition ${
                    active ? "bg-brand-500/15 text-brand-50 border-brand-400/50" : "bg-slate-800 text-slate-200 border border-slate-700"
                  }`}
                >
                  {text}
                </button>
              );
            })}
            {facilityTypes.length === 0 && <p className="text-xs text-slate-500">尚無設施類型</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default LayerToggles;
