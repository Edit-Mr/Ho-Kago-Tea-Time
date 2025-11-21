import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Link } from "react-router-dom";

export type AreaSummary = {
  id: string;
  name: string;
  riskScore: number;
  facilities: number;
  openTickets: number;
  overdueTickets: number;
};

function AreaCard({ area }: { area: AreaSummary }) {
  const riskColor = area.riskScore > 70 ? "danger" : area.riskScore > 40 ? "warning" : "success";
  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-2">
        <Badge variant={riskColor}>風險 {area.riskScore.toFixed(0)}</Badge>
        <div>
          <CardTitle>{area.name}</CardTitle>
          <p className="text-xs text-slate-400">區域摘要</p>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Stat label="設施數" value={area.facilities} />
        <Stat label="開啟票證" value={area.openTickets} />
        <Stat label="逾期票證" value={area.overdueTickets} highlight />
      </CardContent>
      <CardContent>
        <Link to={`/dashboard/${area.id}`}>
          <Button className="w-full">查看儀表板 / Open dashboard</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-3">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className={`text-xl font-semibold ${highlight ? "text-red-300" : "text-slate-50"}`}>{value}</p>
    </div>
  );
}

export default AreaCard;
