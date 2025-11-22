import { useEffect, useMemo, useState } from "react";
import type GeoJSON from "geojson";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Drawer } from "../components/ui/drawer";
import { useDataStore } from "../store/dataStore";

type ReportForm = {
  isHealthy: "yes" | "no" | "";
  maintenanceType: "clean" | "repair" | "renovate" | "replace" | "none" | "";
  note: string;
  photo?: File | null;
};

function isPointInsideGeometry(point: [number, number], geom?: GeoJSON.Geometry): boolean {
  if (!geom) return false;
  if (geom.type === "Polygon") return isPointInPolygon(point, geom.coordinates as GeoJSON.Position[][]);
  if (geom.type === "MultiPolygon") return (geom.coordinates as GeoJSON.Position[][][]).some(poly => isPointInPolygon(point, poly));
  return false;
}

function isPointInPolygon(point: [number, number], rings: GeoJSON.Position[][]): boolean {
  const [lng, lat] = point;
  let inside = false;
  const ring = rings[0];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function MissionsPage() {
  const [area, setArea] = useState("all");
  const [type, setType] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [reportingFacilityId, setReportingFacilityId] = useState<string | null>(null);
  const [reportForm, setReportForm] = useState<ReportForm>({ isHealthy: "", maintenanceType: "", note: "", photo: null });
  const { areas, facilities, facilityTypes, loadAll } = useDataStore();

  useEffect(() => {
    loadAll().catch(() => {});
  }, [loadAll]);

  const upcomingInspections = useMemo(() => {
    return facilities
      .filter((f) => f.lastInspection)
      .map((f) => {
        const last = f.lastInspection ? new Date(f.lastInspection).getTime() : Date.now();
        const nextDue = last + 30 * 24 * 60 * 60 * 1000;
        const daysLeft = Math.max(0, Math.round((nextDue - Date.now()) / (1000 * 60 * 60 * 24)));
        // Find area by geometry
        let areaName = "未指定";
        if (f.coords) {
          const foundArea = areas.find((a) => a.geom && isPointInsideGeometry(f.coords as [number, number], a.geom as GeoJSON.Geometry));
          if (foundArea) areaName = foundArea.name;
        }
        return {
          id: f.id,
          name: f.name,
          type: f.type,
          typeLabel: f.typeLabel ?? f.type,
          typeEmoji: f.typeEmoji ?? undefined,
          area: areaName,
          areaId: areas.find((a) => a.geom && f.coords && isPointInsideGeometry(f.coords, a.geom as GeoJSON.Geometry))?.id,
          dueInDays: daysLeft,
          lastInspection: f.lastInspection?.slice(0, 10) ?? "—",
        };
      })
      .sort((a, b) => a.dueInDays - b.dueInDays);
  }, [areas, facilities]);

  const filtered = useMemo(() => {
    return upcomingInspections.filter((item) => {
      const matchesArea = area === "all" || item.areaId === area;
      const matchesType = type === "all" || item.type === type;
      const matchesKeyword = keyword ? item.name.includes(keyword) || item.area.includes(keyword) : true;
      return matchesArea && matchesType && matchesKeyword;
    });
  }, [area, keyword, type, upcomingInspections]);

  const areaOptions = useMemo(() => [{ id: "all", name: "全部區域" }, ...areas], [areas]);
  const typeOptions = useMemo(
    () =>
      facilityTypes.length
        ? [{ id: "all", label: "全部類型" }, ...facilityTypes.map((t) => ({ id: t.type, label: t.labelZh ?? t.type }))] :
        [
          { id: "all", label: "全部類型" },
          { id: "building", label: "建築物" },
          { id: "street_light", label: "路燈" },
          { id: "park", label: "公園" },
          { id: "public_toilet", label: "公共廁所" },
          { id: "bridge", label: "橋樑" },
          { id: "road", label: "道路" },
          { id: "bike_station", label: "腳踏車站點" },
          { id: "cctv", label: "監視器" },
          { id: "hazardous_factory", label: "危險工廠" },
          { id: "police_station", label: "警察局" }
        ],
    [facilityTypes]
  );

  const handleOpenReport = (facilityId: string) => {
    setReportingFacilityId(facilityId);
    setReportForm({ isHealthy: "", maintenanceType: "", note: "", photo: null });
  };

  const handleSubmitReport = () => {
    const payload = {
      facilityId: reportingFacilityId,
      isHealthy: reportForm.isHealthy,
      maintenanceType: reportForm.maintenanceType,
      note: reportForm.note,
      photo: reportForm.photo?.name,
    };
    // In real app, send to API; keeping console for now
    // eslint-disable-next-line no-console
    console.log("Citizen report submitted", payload);
    setReportingFacilityId(null);
  };

  return (
    <div className="px-6 py-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">居民任務牆</p>
          <h1 className="text-2xl font-semibold text-slate-50">Missions</h1>
          <p className="text-xs text-slate-500">列出即將到期檢查的設施，居民可主動回報狀態</p>
        </div>
        <div className="flex gap-2">
          <Select value={area} onChange={(e) => setArea(e.target.value)}>
            {areaOptions.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {typeOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </Select>
          <Input placeholder="搜尋設施或區域" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((mission) => (
          <Card key={mission.id}>
            <CardHeader className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {mission.typeEmoji && <span>{mission.typeEmoji}</span>}
                  <span>{mission.name}</span>
                </CardTitle>
                <p className="text-xs text-slate-400">
                  {mission.area} · {mission.typeLabel}
                </p>
              </div>
              <Badge variant={mission.dueInDays <= 5 ? "warning" : "default"}>{mission.dueInDays} 天內檢查</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-200">
              <p className="text-xs text-slate-400">上次檢查：{mission.lastInspection}</p>
              <p className="text-xs text-slate-400">預估下次：{mission.dueInDays} 天內</p>
              <Button onClick={() => handleOpenReport(mission.id)}>居民回報</Button>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-sm text-slate-400">目前沒有即將到期的設施</p>}
      </div>

      <ReportDrawer
        open={Boolean(reportingFacilityId)}
        onClose={() => setReportingFacilityId(null)}
        form={reportForm}
        onChange={setReportForm}
        onSubmit={handleSubmitReport}
      />
    </div>
  );
}

function ReportDrawer({
  open,
  onClose,
  form,
  onChange,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  form: ReportForm;
  onChange: (f: ReportForm) => void;
  onSubmit: () => void;
}) {
  return (
    <Drawer open={open} onClose={onClose} title="居民回報">
      <div className="space-y-4 text-sm text-slate-200">
        <div>
          <p className="text-xs text-slate-400 pb-1">設備狀態是否良好？</p>
          <div className="flex gap-2">
            <Button variant={form.isHealthy === "yes" ? "primary" : "secondary"} onClick={() => onChange({ ...form, isHealthy: "yes" })}>是</Button>
            <Button variant={form.isHealthy === "no" ? "primary" : "secondary"} onClick={() => onChange({ ...form, isHealthy: "no" })}>否</Button>
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-400 pb-1">需要什麼維護？</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={form.maintenanceType === "clean" ? "primary" : "secondary"} onClick={() => onChange({ ...form, maintenanceType: "clean" })}>清潔</Button>
            <Button variant={form.maintenanceType === "repair" ? "primary" : "secondary"} onClick={() => onChange({ ...form, maintenanceType: "repair" })}>修復</Button>
            <Button variant={form.maintenanceType === "renovate" ? "primary" : "secondary"} onClick={() => onChange({ ...form, maintenanceType: "renovate" })}>整修</Button>
            <Button variant={form.maintenanceType === "replace" ? "primary" : "secondary"} onClick={() => onChange({ ...form, maintenanceType: "replace" })}>更換</Button>
            <Button variant={form.maintenanceType === "none" ? "primary" : "secondary"} onClick={() => onChange({ ...form, maintenanceType: "none" })}>不需要</Button>
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-400 pb-1">留言</p>
          <Textarea
            placeholder="描述現場狀況..."
            value={form.note}
            onChange={(e) => onChange({ ...form, note: e.target.value })}
          />
        </div>
        <div>
          <p className="text-xs text-slate-400 pb-1">上傳照片 (選填)</p>
          <Input type="file" accept="image/*" onChange={(e) => onChange({ ...form, photo: e.target.files?.[0] ?? null })} />
          {form.photo && <p className="text-xs text-slate-500 mt-1">已選擇：{form.photo.name}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={onSubmit} disabled={!form.isHealthy || !form.maintenanceType}>送出</Button>
        </div>
      </div>
    </Drawer>
  );
}

export default MissionsPage;
