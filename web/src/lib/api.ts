import type GeoJSON from "geojson";
import { supabase } from "./supabaseClient";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function sendChat(messages: ChatMessage[]): Promise<ChatMessage> {
  // Placeholder LLM call; keep minimal to avoid fake data usage.
  const last = messages[messages.length - 1];
  return { role: "assistant", content: `收到：「${last.content}」，目前僅支援資料查詢，請點選地圖或儀表板檢視。` };
}

export type TicketFormData = {
  facilityId?: string;
  areaId?: string;
  issueType: string;
  severity: "low" | "medium" | "high";
  description: string;
  photo?: File | null;
  coordinates?: [number, number];
};

const severityMap: Record<TicketFormData["severity"], number> = { low: 1, medium: 2, high: 3 };

export async function submitTicket(formData: TicketFormData): Promise<{ id: string; status: string } | { error: string }> {
  try {
    if (!supabase) throw new Error("Supabase 未設定，請設定 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
    const { facilityId, areaId, coordinates } = formData;
    const geom = coordinates ? { type: "Point", coordinates } satisfies GeoJSON.Point : null;
    const { data, error } = await supabase
      .from("tickets")
      .insert({
        facility_id: facilityId ?? null,
        area_id: areaId ?? null,
        geom,
        source: "citizen",
        type: formData.issueType,
        severity: severityMap[formData.severity],
        status: "open",
        description: formData.description,
        photo_urls: [], // file upload pipeline can append later
      })
      .select("id,status")
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id, status: data.status };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "回報失敗" };
  }
}

type ApiResult<T> = { data?: T; error?: string };

export async function fetchAreas(): Promise<ApiResult<Array<{ id: string; name: string; code?: string | null; populationTotal?: number | null; geom: GeoJSON.Geometry }>>> {
  if (!supabase) return { error: "Supabase 環境變數未設定" };
  const { data, error } = await supabase
    .from("areas")
    .select("id,name,code,population_total,geom");
  if (error) return { error: error.message };
  return {
    data: data?.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      populationTotal: row.population_total,
      geom: row.geom as GeoJSON.Geometry,
    })),
  };
}

export async function fetchAreaRiskSnapshots(): Promise<ApiResult<Array<{ areaId: string; riskScore: number; computedAt: string; _computedAtRaw: string }>>> {
  if (!supabase) return { error: "Supabase 環境變數未設定" };
  const { data, error } = await supabase
    .from("area_risk_snapshots")
    .select("area_id,risk_score,computed_at")
    .order("computed_at", { ascending: false });
  if (error) return { error: error.message };
  return {
    data: data?.map((row) => ({
      areaId: row.area_id,
      riskScore: Number(row.risk_score),
      computedAt: new Date(row.computed_at).toISOString().slice(0, 10),
      _computedAtRaw: row.computed_at,
    })),
  };
}

export async function fetchFacilities(): Promise<ApiResult<Array<{ id: string; areaId?: string | null; type: string; name: string; iconEmoji?: string | null; geom: GeoJSON.Geometry; healthGrade?: string | null; lastInspectionAt?: string | null; hasOpenTicket?: boolean }>>> {
  if (!supabase) return { error: "Supabase 環境變數未設定" };
  const { data, error } = await supabase
    .from("facilities")
    .select("id,area_id,type,name,icon_emoji,geom,health_grade,last_inspection_at,has_open_ticket");
  if (error) return { error: error.message };
  return {
    data: data?.map((row) => ({
      id: row.id,
      areaId: row.area_id,
      type: row.type,
      name: row.name,
      iconEmoji: row.icon_emoji,
      geom: row.geom as GeoJSON.Geometry,
      healthGrade: row.health_grade,
      lastInspectionAt: row.last_inspection_at,
      hasOpenTicket: row.has_open_ticket,
    })),
  };
}

export async function fetchFacilityInspections(): Promise<ApiResult<Array<{ facilityId: string; inspectedAt: string; incidentCountLastYear?: number | null; notes?: string | null }>>> {
  if (!supabase) return { error: "Supabase 環境變數未設定" };
  const { data, error } = await supabase
    .from("facility_inspections")
    .select("facility_id,inspected_at,incident_count_last_year,notes")
    .order("inspected_at", { ascending: false });
  if (error) return { error: error.message };
  return {
    data: data?.map((row) => ({
      facilityId: row.facility_id,
      inspectedAt: row.inspected_at,
      incidentCountLastYear: row.incident_count_last_year,
      notes: row.notes,
    })),
  };
}

export async function fetchTickets(): Promise<ApiResult<Array<{ id: string; areaId?: string | null; facilityId?: string | null; geom?: GeoJSON.Geometry | null; status: string; type: string; severity?: number | null; slaDueAt?: string | null; createdAt?: string | null; description?: string | null; photoUrls?: string[] | null }>>> {
  if (!supabase) return { error: "Supabase 環境變數未設定" };
  const { data, error } = await supabase
    .from("tickets")
    .select("id,area_id,facility_id,geom,status,type,severity,sla_due_at,created_at,description,photo_urls");
  if (error) return { error: error.message };
  return {
    data: data?.map((row) => ({
      id: row.id,
      areaId: row.area_id,
      facilityId: row.facility_id,
      geom: row.geom as GeoJSON.Geometry | null,
      status: row.status,
      type: row.type,
      severity: row.severity,
      slaDueAt: row.sla_due_at,
      createdAt: row.created_at,
      description: row.description,
      photoUrls: row.photo_urls,
    })),
  };
}

export async function fetchTicketEvents(): Promise<ApiResult<Array<{ ticketId: string; eventType: string; createdAt: string; data?: Record<string, unknown> | null }>>> {
  if (!supabase) return { error: "Supabase 環境變數未設定" };
  const { data, error } = await supabase
    .from("ticket_events")
    .select("ticket_id,event_type,created_at,data")
    .order("created_at", { ascending: true });
  if (error) return { error: error.message };
  return {
    data: data?.map((row) => ({
      ticketId: row.ticket_id,
      eventType: row.event_type,
      createdAt: row.created_at,
      data: row.data,
    })),
  };
}

export async function fetchMissions(): Promise<ApiResult<Array<{ id: string; areaId?: string | null; facilityId?: string | null; title: string; description?: string | null; type?: string | null; status: string; dueAt?: string | null }>>> {
  if (!supabase) return { error: "Supabase 環境變數未設定" };
  const { data, error } = await supabase
    .from("missions")
    .select("id,area_id,facility_id,title,description,type,status,due_at");
  if (error) return { error: error.message };
  return {
    data: data?.map((row) => ({
      id: row.id,
      areaId: row.area_id,
      facilityId: row.facility_id,
      title: row.title,
      description: row.description,
      type: row.type,
      status: row.status,
      dueAt: row.due_at,
    })),
  };
}
