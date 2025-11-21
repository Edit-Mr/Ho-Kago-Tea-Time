import { useMapStore } from "../store/mapStore";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

const scenarios = [
  {
    key: "official_priority",
    title: "官員找優先處理區域",
    desc: "風險熱度圖、逾期工單集中度、低預算高事故區",
  },
  { key: "custom", title: "自訂圖層", desc: "自由開關各維度圖層" },
] as const;

function ScenarioSelector() {
  const selectedScenario = useMapStore((s) => s.selectedScenario);
  const setScenario = useMapStore((s) => s.setScenario);

  return (
    <Card className="max-w-md">
      <CardHeader className="items-start">
        <div>
          <CardTitle>情境模式</CardTitle>
          <p className="text-sm text-slate-400">快速切換常用查詢情境</p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        {scenarios.map((scenario) => (
          <div
            key={scenario.key}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 px-3 py-3"
          >
            <div>
              <p className="font-semibold text-slate-50">{scenario.title}</p>
              <p className="text-xs text-slate-400">{scenario.desc}</p>
            </div>
            <Button
              variant={selectedScenario === scenario.key ? "primary" : "secondary"}
              onClick={() => setScenario(scenario.key)}
            >
              {selectedScenario === scenario.key ? "使用中" : "啟用"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default ScenarioSelector;
