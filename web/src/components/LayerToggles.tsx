import { useMapStore, type MapStore, type Scenario, type BackgroundMode, type NoiseTime } from "../store/mapStore";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

type LayerKey = keyof MapStore["activeLayers"];
type LayerTogglesProps = {
  facilityTypes: Array<{ type: string; label: string; emoji?: string }>;
};

const scenarioPresets: Array<{ id: Scenario; title: string; description: string; highlights: string[] }> = [
  {
    id: "aging_infra",
    title: "老舊設施 / 預期維護",
    description: "所有設施顯示，顏色代表健康等級；背景維持風險分數。",
    highlights: ["健康等級", "逾期維護", "風險背景"],
  },
  {
    id: "gender_ratio",
    title: "社區男女比",
    description: "背景以紅到藍呈現男女比，圖示隱藏。",
    highlights: ["紅藍背景", "人口結構"],
  },
  {
    id: "avg_age",
    title: "社區平均年齡",
    description: "背景紅藍漸層呈現平均年齡，圖示隱藏。",
    highlights: ["平均年齡", "紅藍背景"],
  },
  {
    id: "building_age",
    title: "屋齡",
    description: "只顯示大樓/屋齡點，紅黃綠代表年齡；背景為區域平均屋齡。",
    highlights: ["屋齡圖示", "紅黃綠背景"],
  },
  {
    id: "safety",
    title: "安全性",
    description: "只顯示監視器、警察局；背景依密度紅黃綠。",
    highlights: ["監視器", "警局", "安全密度"],
  },
  {
    id: "noise",
    title: "噪音",
    description: "顯示噪音測點，切換上午/下午/晚上；背景取平均噪音。",
    highlights: ["噪音測點", "時間切換", "背景平均"],
  },
  {
    id: "custom",
    title: "自由模式",
    description: "自訂圖層與背景，選你要看的資訊。",
    highlights: ["自訂視圖"],
  },
];

const layerLabels: Record<LayerKey, string> = {
  areas: "區域風險多邊形",
  facilities: "設施圖示",
  tickets: "工單票證",
  heatmap: "風險熱區",
  buildingAges: "屋齡圖示",
  noisePoints: "噪音圖示",
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
  const backgroundMode = useMapStore((s) => s.backgroundMode);
  const setBackgroundMode = useMapStore((s) => s.setBackgroundMode);
  const noiseTime = useMapStore((s) => s.noiseTime);
  const setNoiseTime = useMapStore((s) => s.setNoiseTime);

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
        <div className="space-y-2">
          <p className="text-xs text-slate-400">背景呈現</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "risk", label: "風險分數" },
              { id: "gender_ratio", label: "男女比" },
              { id: "avg_age", label: "平均年齡" },
              { id: "building_age", label: "屋齡" },
              { id: "safety", label: "安全密度" },
              { id: "noise", label: "噪音平均" },
            ].map((item) => {
              const active = backgroundMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setBackgroundMode(item.id as BackgroundMode);
                    setScenario("custom");
                  }}
                  className={`w-full rounded-lg border px-2 py-1.5 text-xs transition ${
                    active ? "border-brand-400/80 bg-brand-500/10 text-slate-50" : "border-slate-800 bg-slate-900/60 text-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          {backgroundMode === "noise" && (
            <div className="flex flex-wrap gap-1 pt-1">
              {(["morning", "afternoon", "night"] as NoiseTime[]).map((slot) => {
                const active = noiseTime === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setNoiseTime(slot)}
                    className={`px-2 py-1 rounded-full text-[11px] border transition ${
                      active ? "bg-amber-500/20 border-amber-400/40 text-amber-50" : "bg-slate-800 border-slate-700 text-slate-200"
                    }`}
                  >
                    {slot === "morning" ? "上午" : slot === "afternoon" ? "下午" : "晚上"}
                  </button>
                );
              })}
            </div>
          )}
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
            {facilityTypes.map(({ type, label }) => {
              const active = facilityTypeFilter.length === 0 || facilityTypeFilter.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleFacilityType(type)}
                  className={`px-2 py-1 rounded-full text-[11px] border transition ${
                    active ? "bg-brand-500/15 text-brand-50 border-brand-400/50" : "bg-slate-800 text-slate-200 border border-slate-700"
                  }`}
                >
                  {label}
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
