import type { TicketRecord } from "../store/dataStore";

export type TicketStatusCompact = "open" | "within_sla" | "overdue";

export function deriveTicketStatus(ticket?: Pick<TicketRecord, "status" | "slaDueAt">): TicketStatusCompact | undefined {
  if (!ticket) return undefined;
  const isClosed = ticket.status === "completed" || ticket.status === "cancelled";
  if (isClosed) return "open";
  const isOverdue = ticket.slaDueAt ? new Date(ticket.slaDueAt).getTime() < Date.now() : false;
  return isOverdue ? "overdue" : "within_sla";
}
