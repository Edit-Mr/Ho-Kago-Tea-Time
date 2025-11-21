import { useMapStore, type MapStore, type Scenario } from "../store/mapStore";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

type LayerKey = keyof MapStore["activeLayers"];

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

function LayerToggles() {
  const activeLayers = useMapStore((s) => s.activeLayers);
  const toggleLayer = useMapStore((s) => s.toggleLayer);
  const selectedScenario = useMapStore((s) => s.selectedScenario);
  const setScenario = useMapStore((s) => s.setScenario);

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
      </CardContent>
    </Card>
  );
}

export default LayerToggles;
