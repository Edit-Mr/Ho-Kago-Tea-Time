import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";

function PolicyExperimentCard() {
  const [budgetIncrease, setBudgetIncrease] = useState(20);
  const forecast = useMemo(() => {
    const redZones = Math.max(0, 12 - Math.round(budgetIncrease * 0.3));
    const yellowZones = 18 + Math.round(budgetIncrease * 0.2);
    const greenZones = 6 + Math.round(budgetIncrease * 0.1);
    const overdueDrop = Math.max(0, 24 - Math.round(budgetIncrease * 0.5));
    return { redZones, yellowZones, greenZones, overdueDrop };
  }, [budgetIncrease]);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>政策實驗模式</CardTitle>
        <Badge className="text-[11px]">模擬</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-200">
        <div>
          <p className="text-xs text-slate-400 mb-1">如果增加公園維護預算</p>
          <div className="flex items-center gap-2">
            <Input
              type="range"
              min={0}
              max={40}
              step={5}
              value={budgetIncrease}
              onChange={(e) => setBudgetIncrease(Number(e.target.value))}
            />
            <span className="text-slate-50 w-16 text-right">+{budgetIncrease}%</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <ForecastCard label="紅區" value={forecast.redZones} tone="danger" />
          <ForecastCard label="黃區" value={forecast.yellowZones} tone="warning" />
          <ForecastCard label="綠區" value={forecast.greenZones} tone="success" />
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-800/40 p-2 text-xs leading-relaxed text-slate-300">
          優先給「風險高 + 小孩多 + 逾期高」的里，預估逾期工單可從 24 件降至{" "}
          <span className="text-emerald-300">{forecast.overdueDrop}</span> 件。
        </div>
      </CardContent>
    </Card>
  );
}

function ForecastCard({ label, value, tone }: { label: string; value: number; tone: "danger" | "warning" | "success" }) {
  const toneClass =
    tone === "danger" ? "text-red-200 border-red-500/40 bg-red-500/10" : tone === "warning" ? "text-amber-200 border-amber-400/40 bg-amber-400/10" : "text-emerald-200 border-emerald-400/40 bg-emerald-400/10";
  return (
    <div className={`rounded-lg border px-2 py-1 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

export default PolicyExperimentCard;
