import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { useDataStore } from "../store/dataStore";

type MissionStatus = "open" | "completed" | "expired";

function MissionsPage() {
  const [area, setArea] = useState("all");
  const [type, setType] = useState("all");
  const [keyword, setKeyword] = useState("");
  const { missions, areas, facilities, loadAll } = useDataStore();

  useEffect(() => {
    loadAll().catch(() => {});
  }, [loadAll]);

  const filtered = useMemo(() => {
    return missions.filter((mission) => {
      const areaName = areas.find((a) => a.id === mission.areaId)?.name;
      const facilityName = facilities.find((f) => f.id === mission.facilityId)?.name;
      const matchesArea = area === "all" || mission.areaId === area;
      const matchesType = type === "all" || mission.type === type;
      const matchesKeyword = keyword ? (mission.title?.includes(keyword) || facilityName?.includes(keyword) || areaName?.includes(keyword)) : true;
      return matchesArea && matchesType && matchesKeyword;
    });
  }, [missions, area, type, keyword, areas, facilities]);

  return (
    <div className="px-6 py-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">居民任務牆</p>
          <h1 className="text-2xl font-semibold text-slate-50">Missions</h1>
        </div>
        <div className="flex gap-2">
          <Select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="all">全部區域</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">全部類型</option>
            <option value="park">公園</option>
            <option value="street_light">路燈</option>
            <option value="road">道路</option>
            <option value="sidewalk">人行道</option>
            <option value="other">其他</option>
          </Select>
          <Input placeholder="關鍵字" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((mission) => (
          <MissionCard
            key={mission.id}
            mission={{
              ...mission,
              area: areas.find((a) => a.id === mission.areaId)?.name ?? "未指定",
              facility: facilities.find((f) => f.id === mission.facilityId)?.name ?? "未指定",
              due: mission.dueAt ? new Date(mission.dueAt).toISOString().slice(0, 10) : "—",
              status: (mission.status as MissionStatus) ?? "open",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MissionCard({
  mission,
}: {
  mission: {
    id: string;
    title: string;
    area: string;
    facility: string;
    due: string;
    status: MissionStatus;
    type?: string | null;
    description?: string | null;
  };
}) {
  const statusChip =
    mission.status === "open"
      ? { label: "招募中", variant: "warning" as const }
      : mission.status === "completed"
        ? { label: "完成", variant: "success" as const }
        : { label: "已到期", variant: "danger" as const };

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle>{mission.title}</CardTitle>
          <p className="text-xs text-slate-400">
            {mission.area} · {mission.facility}
          </p>
        </div>
        <Badge variant={statusChip.variant}>{statusChip.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-200">
        <p>{mission.description}</p>
        <p className="text-xs text-slate-400">Due: {mission.due}</p>
      </CardContent>
    </Card>
  );
}

export default MissionsPage;
