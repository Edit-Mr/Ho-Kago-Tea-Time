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

type AreaSelect = "full" | "lite";

export async function fetchAreas(params?: { county?: string; areaId?: string; select?: AreaSelect }): Promise<ApiResult<Array<{ id: string; name: string; code?: string | null; county: string; populationTotal?: number | null; geom?: GeoJSON.Geometry }>>> {
  if (!supabase) return { error: "Supabase 環境變數未設定" };
  const selectMode: AreaSelect = params?.select ?? "full";
  const selectColumns = selectMode === "full" ? "id,name,code,county,population_total,geom" : "id,name,code,county";
  const select = supabase.from("areas").select(selectColumns);
  const query = params?.county ? select.eq("county", params.county) : params?.areaId ? select.eq("id", params.areaId) : select;
  const { data, error } = await query;
  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("column") && msg.includes("county")) {
      return { error: "areas 表缺少 county 欄位，請先在資料庫加入 county 後再重試" };
    }
    return { error: error.message };
  }
  try {
    const mapped = data?.map((row) => {
      const county = (row as Record<string, unknown>).county;
      if (county === undefined || county === null || county === "") {
        throw new Error("areas 資料缺少 county 值，請確認縣市欄位已填寫");
      }
      return {
        id: row.id,
        name: row.name,
        code: row.code,
        county: county as string,
        populationTotal: row.population_total,
        geom: (row as any).geom as GeoJSON.Geometry | undefined,
      };
    });
    return { data: mapped };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "areas 資料缺少 county 欄位值" };
  }
}

export async function fetchAreaByPoint(center: [number, number]): Promise<ApiResult<{ id: string; county: string }>> {
  if (!supabase) return { error: "Supabase 環境變數未設定" };
  const [lng, lat] = center;
  const { data, error } = await supabase.rpc("find_area_by_point", { lng, lat }).select("id,county").single();
  if (error) {
    if (error.message?.toLowerCase().includes("find_area_by_point")) return { error: "資料庫缺少 find_area_by_point RPC，請先部署 schema" };
    return { error: error.message };
  }
  if (!data?.id || !data?.county) return { error: "未找到中心點所在行政區，請確認座標與資料庫" };
  return { data: { id: data.id, county: data.county as string } };
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

export async function fetchFacilities(areaId?: string): Promise<ApiResult<Array<{ id: string; areaId?: string | null; type: string; name: string; geom: GeoJSON.Geometry; healthGrade?: string | null; lastInspectionAt?: string | null }>>> {
  if (!supabase) return { error: "Supabase 環境變數未設定" };
  const selectFields = "id,area_id,type,name,geom,health_grade,last_inspection_at";

  // Prefer DB-side spatial filtering so facilities without area_id but located in the city are included.
  if (areaId) {
    const { data: spatialData, error: spatialError } = await supabase.rpc("facilities_in_area", { target_area_id: areaId });
    if (!spatialError && spatialData) {
      return {
        data: spatialData.map((row) => ({
          id: row.id,
          areaId: row.area_id,
          type: row.type,
          name: row.name,
          geom: row.geom as GeoJSON.Geometry,
          healthGrade: row.health_grade,
          lastInspectionAt: row.last_inspection_at,
        })),
      };
    }
    if (spatialError && !missingFunction(spatialError, "facilities_in_area")) return { error: spatialError.message };
    // Fall back to simple area_id filter if the RPC is unavailable (older schema).
    const base = supabase.from("facilities").select(selectFields);
    const { data, error } = await base.eq("area_id", areaId);
    if (error) return { error: error.message };
    return {
      data: data?.map((row) => ({
        id: row.id,
        areaId: row.area_id,
        type: row.type,
        name: row.name,
        geom: row.geom as GeoJSON.Geometry,
        healthGrade: row.health_grade,
        lastInspectionAt: row.last_inspection_at,
      })),
    };
  }

  const { data, error } = await supabase.from("facilities").select(selectFields);
  if (error) return { error: error.message };
  return {
    data: data?.map((row) => ({
      id: row.id,
      areaId: row.area_id,
      type: row.type,
      name: row.name,
      geom: row.geom as GeoJSON.Geometry,
      healthGrade: row.health_grade,
      lastInspectionAt: row.last_inspection_at,
    })),
  };
}

export async function fetchFacilityTypes(): Promise<ApiResult<Array<{ type: string; labelZh: string; emoji?: string | null; iconName?: string | null }>>> {
  if (!supabase) return { error: "Supabase 環境變數未設定" };
  const { data, error } = await supabase.from("facility_type_meta").select("type,label_zh,emoji,icon_name");
  if (error) return { error: error.message };
  return {
    data: data?.map((row) => ({
      type: row.type,
      labelZh: row.label_zh,
      emoji: row.emoji,
      iconName: row.icon_name,
    })),
  };
}

export async function fetchFacilityInspections(facilityIds?: string[]): Promise<ApiResult<Array<{ facilityId: string; inspectedAt: string; incidentCountLastYear?: number | null; notes?: string | null }>>> {
  if (!supabase) return { error: "Supabase 環境變數未設定" };
  if (facilityIds && facilityIds.length === 0) return { data: [] };
  let query = supabase
    .from("facility_inspections")
    .select("facility_id,inspected_at,incident_count_last_year,notes")
    .order("inspected_at", { ascending: false });
  if (facilityIds) query = query.in("facility_id", facilityIds);
  const { data, error } = await query;
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

export async function fetchTickets(areaId?: string): Promise<ApiResult<Array<{ id: string; areaId?: string | null; facilityId?: string | null; geom?: GeoJSON.Geometry | null; status: string; type: string; severity?: number | null; slaDueAt?: string | null; createdAt?: string | null; description?: string | null; photoUrls?: string[] | null }>>> {
  if (!supabase) return { error: "Supabase 環境變數未設定" };
  const selectFields = "id,area_id,facility_id,geom,status,type,severity,sla_due_at,created_at,description,photo_urls";

  if (areaId) {
    const { data: spatialData, error: spatialError } = await supabase.rpc("tickets_in_area", { target_area_id: areaId });
    if (!spatialError && spatialData) {
      return {
        data: spatialData.map((row) => ({
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
    if (spatialError && !missingFunction(spatialError, "tickets_in_area")) return { error: spatialError.message };
    const base = supabase.from("tickets").select(selectFields);
    const { data, error } = await base.eq("area_id", areaId);
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

  const { data, error } = await supabase.from("tickets").select(selectFields);
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

function missingFunction(error: { message?: string }, functionName: string) {
  return !!error?.message && error.message.toLowerCase().includes(`${functionName} does not exist`);
}

export async function fetchTicketEvents(ticketIds?: string[]): Promise<ApiResult<Array<{ ticketId: string; eventType: string; createdAt: string; data?: Record<string, unknown> | null }>>> {
  if (!supabase) return { error: "Supabase 環境變數未設定" };
  if (ticketIds && ticketIds.length === 0) return { data: [] };
  let query = supabase
    .from("ticket_events")
    .select("ticket_id,event_type,created_at,data")
    .order("created_at", { ascending: true });
  if (ticketIds) query = query.in("ticket_id", ticketIds);
  const { data, error } = await query;
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
