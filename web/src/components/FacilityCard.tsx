import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useUiStore } from "../store/uiStore";
import { AlertTriangle, CheckCircle, Clock3 } from "lucide-react";

export type Facility = {
  id: string;
  name: string;
  type: string;
  typeLabel?: string;
  typeEmoji?: string | null;
  address?: string;
  lastInspection: string;
  grade: "A" | "B" | "C";
  incidentsPastYear: number;
  pendingIssues?: string[];
  slaDue?: string;
  ticketStatus?: "open" | "within_sla" | "overdue";
  timeline?: Array<{ label: string; date: string; status: "done" | "in_progress" | "pending" }>;
  tags?: string[];
};

const gradeColors: Record<Facility["grade"], { label: string; badge: "success" | "warning" | "danger" }> = {
  A: { label: "A · 近期檢查且無待修", badge: "success" },
  B: { label: "B · 有輕微待修", badge: "warning" },
  C: { label: "C · 久未檢查/重大問題", badge: "danger" },
};

const typeLabels: Record<string, string> = {
  park: "公園",
  playground: "遊戲場",
  streetlight: "路燈",
  street_light: "路燈",
  police_station: "警察局",
  sidewalk: "人行道",
  road_hazard: "道路坑洞",
  drinking_fountain: "飲水機",
  elder_center: "樂齡中心",
  school_zone: "校園周邊",
};

function FacilityCard({ facility }: { facility: Facility }) {
  const openTicketForm = useUiStore((s) => s.openTicketForm);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{facility.name}</CardTitle>
          <p className="text-xs text-slate-400 capitalize">
            {facility.typeEmoji ? `${facility.typeEmoji} ` : ""}
            {facility.typeLabel ?? typeLabels[facility.type] ?? facility.type}
          </p>
        </div>
        <Badge variant={gradeColors[facility.grade].badge}>
          {gradeColors[facility.grade].label}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-slate-300 space-y-1">
          {facility.address && (
            <p className="text-xs text-slate-400">
              {facility.address}
            </p>
          )}
          {facility.tags && (
            <div className="flex flex-wrap gap-1 pt-1">
              {facility.tags.map((tag) => (
                <span key={tag} className="text-[11px] rounded-full bg-slate-800/80 px-2 py-0.5 text-slate-300">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p>
            最近檢查：<span className="text-slate-100">{facility.lastInspection}</span>
          </p>
          <p>過去一年事件數：{facility.incidentsPastYear}</p>
          {facility.slaDue && (
            <p className="flex items-center gap-2 text-slate-300">
              <SlaBadge status={facility.ticketStatus ?? "open"} /> SLA 到期：{facility.slaDue}
            </p>
          )}
          {facility.pendingIssues && facility.pendingIssues.length > 0 && (
            <div>
              <p className="text-slate-400">待修項目：</p>
              <ul className="list-disc list-inside text-slate-100">
                {facility.pendingIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
          {facility.timeline && (
            <div className="pt-2">
              <p className="text-xs text-slate-400">維護時間軸</p>
              <ol className="mt-1 space-y-1.5">
                {facility.timeline.map((step) => (
                  <li key={`${facility.id}-${step.label}`} className="flex items-start gap-2 text-sm text-slate-200">
                    {renderStepIcon(step.status)}
                    <div>
                      <p className="leading-tight">{step.label}</p>
                      <p className="text-[11px] text-slate-400">{step.date}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {facility.ticketStatus === "overdue" && (
                <p className="mt-2 text-xs text-red-200">⚠️ 已逾期，需優先派工</p>
              )}
            </div>
          )}
        </div>
        <div className="pt-3 flex gap-2">
          <Button onClick={openTicketForm}>回報問題 / Report issue</Button>
          <Button variant="secondary">狀態良好</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function renderStepIcon(status: "done" | "in_progress" | "pending") {
  const base = "h-4 w-4";
  if (status === "done") return <CheckCircle className={`${base} text-emerald-400`} aria-hidden />;
  if (status === "in_progress") return <Clock3 className={`${base} text-amber-300`} aria-hidden />;
  return <AlertTriangle className={`${base} text-red-300`} aria-hidden />;
}

function SlaBadge({ status }: { status: "open" | "within_sla" | "overdue" }) {
  if (status === "overdue")
    return (
      <Badge variant="danger" className="inline-flex items-center gap-1">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        逾期
      </Badge>
    );
  if (status === "within_sla")
    return (
      <Badge variant="warning" className="inline-flex items-center gap-1">
        <Clock3 className="h-3.5 w-3.5" aria-hidden />
        進行中
      </Badge>
    );
  return (
    <Badge className="inline-flex items-center gap-1">
      <CheckCircle className="h-3.5 w-3.5" aria-hidden />
      開啟
    </Badge>
  );
}

export default FacilityCard;
