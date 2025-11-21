import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { AlertTriangle, Clock3, Circle } from "lucide-react";
import { useDataStore } from "../store/dataStore";
import { deriveTicketStatus, type TicketStatusCompact } from "../utils/tickets";

function AdminPage() {
  const { tickets, facilities, loadAll } = useDataStore();

  useEffect(() => {
    loadAll().catch(() => {});
  }, [loadAll]);

  const ticketRows = useMemo(() => {
    return tickets
      .map((t) => ({
        id: t.id,
        title: t.description ?? t.type,
        status: deriveTicketStatus(t) ?? "open",
        severity: t.severity ?? 1,
        due: t.slaDueAt ? new Date(t.slaDueAt).toISOString().slice(0, 10) : "—",
      }))
      .sort((a, b) => a.due.localeCompare(b.due));
  }, [tickets]);

  const upcomingInspections = useMemo(() => {
    return facilities
      .filter((f) => f.lastInspection)
      .map((f) => {
        const last = f.lastInspection ? new Date(f.lastInspection).getTime() : Date.now();
        const nextDue = last + 30 * 24 * 60 * 60 * 1000;
        const daysLeft = Math.max(0, Math.round((nextDue - Date.now()) / (1000 * 60 * 60 * 24)));
        return { id: f.id, name: f.name, type: f.type, dueInDays: daysLeft };
      })
      .sort((a, b) => a.dueInDays - b.dueInDays)
      .slice(0, 10);
  }, [facilities]);

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
                {ticketRows.map((ticket) => (
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
                {upcomingInspections.map((f) => (
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
