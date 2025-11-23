import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { AlertTriangle, Clock3, Circle } from "lucide-react";
import { type TicketStatusCompact } from "../utils/tickets";

function AdminPage() {
  const demoTickets = useMemo(
    () => [
      { id: "t1", title: "路燈故障 - 光復路 #12", status: "overdue" as TicketStatusCompact, severity: 3, due: "2024-11-25" },
      { id: "t2", title: "公園滑梯鬆動 - 關新公園", status: "within_sla" as TicketStatusCompact, severity: 2, due: "2024-12-05" },
      { id: "t3", title: "監視器畫面模糊 - 科園路 #3", status: "within_sla" as TicketStatusCompact, severity: 1, due: "2024-12-03" },
      { id: "t4", title: "人行道破損 - 經國路", status: "overdue" as TicketStatusCompact, severity: 2, due: "2024-11-20" },
      { id: "t5", title: "雨水溝蓋鬆脫 - 中央路", status: "open" as TicketStatusCompact, severity: 1, due: "2024-12-18" },
      { id: "t6", title: "派出所外牆滲水 - 中壢派出所", status: "open" as TicketStatusCompact, severity: 2, due: "2024-12-22" },
      { id: "t7", title: "道路坑洞 - 香山步道口", status: "within_sla" as TicketStatusCompact, severity: 2, due: "2024-12-01" }
    ],
    []
  );

  const demoInspections = useMemo(
    () => [
      { id: "f1", name: "關新公園", type: "park", dueInDays: 4 },
      { id: "f2", name: "光復路路燈 #12", type: "street_light", dueInDays: 7 },
      { id: "f3", name: "經國派出所", type: "police_station", dueInDays: 12 },
      { id: "f4", name: "青草湖步道", type: "road", dueInDays: 2 },
      { id: "f5", name: "香山海岸公園", type: "park", dueInDays: 15 },
      { id: "f6", name: "桃園藝文特區路燈 #21", type: "street_light", dueInDays: 9 },
      { id: "f7", name: "中壢國民運動中心", type: "building", dueInDays: 18 },
      { id: "f8", name: "科園路監視器 #3", type: "cctv", dueInDays: 6 }
    ],
    []
  );

  return (
    <div className="px-6 py-6 space-y-4">
      <h1 className="text-2xl font-semibold text-slate-50">Admin / SLA 設定 (Public Demo)</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>工單列表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400">
                  <th className="text-left py-2">標題</th>
                  <th className="text-left">狀態</th>
                  <th className="text-left">優先</th>
                  <th className="text-left">SLA 到期</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {demoTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="py-2 text-slate-100">{ticket.title}</td>
                    <td>{renderStatusChip(ticket.status)}</td>
                    <td className="capitalize text-slate-300">{ticket.severity}</td>
                      <td className="text-slate-300">{ticket.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>即將到期檢查的設施</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400">
                  <th className="text-left py-2">設施</th>
                  <th className="text-left">類型</th>
                  <th className="text-left">剩餘天數</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {demoInspections.map((f) => (
                  <tr key={f.id}>
                    <td className="py-2 text-slate-100">{f.name}</td>
                    <td className="text-slate-300 capitalize">{f.type}</td>
                    <td className={f.dueInDays <= 5 ? "text-amber-200" : "text-slate-200"}>{f.dueInDays} 天</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function renderStatusChip(status: TicketStatusCompact) {
  if (status === "overdue")
    return (
      <Badge variant="danger">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        <span className="ml-1">Overdue</span>
      </Badge>
    );
  if (status === "within_sla")
    return (
      <Badge variant="warning">
        <Clock3 className="h-3.5 w-3.5" aria-hidden />
        <span className="ml-1">Within SLA</span>
      </Badge>
    );
  return (
    <Badge>
      <Circle className="h-3.5 w-3.5" aria-hidden />
      <span className="ml-1">Open</span>
    </Badge>
  );
}

export default AdminPage;
