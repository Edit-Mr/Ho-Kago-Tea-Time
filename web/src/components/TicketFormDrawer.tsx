import { useEffect, useState } from "react";
import { Drawer } from "./ui/drawer";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { useUiStore } from "../store/uiStore";
import { submitTicket, type TicketFormData } from "../lib/api";

type Props = {
  facilityId?: string;
  facilities?: Array<{ id: string; name: string; areaId?: string | null; coords?: [number, number] }>;
  areas?: Array<{ id: string; name: string }>;
};

function TicketFormDrawer({ facilityId, facilities = [], areas = [] }: Props) {
  const isOpen = useUiStore((s) => s.isTicketFormOpen);
  const close = useUiStore((s) => s.closeTicketForm);
  const [form, setForm] = useState<TicketFormData>({
    facilityId,
    areaId: facilities.find((f) => f.id === facilityId)?.areaId ?? areas[0]?.id,
    issueType: "safety",
    severity: "medium",
    description: "",
    photo: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedFacility = facilities.find((f) => f.id === form.facilityId);

  // Keep facility selection in sync with map highlight
  useEffect(() => {
    if (!facilityId) return;
    const facility = facilities.find((f) => f.id === facilityId);
    setForm((prev) => ({
      ...prev,
      facilityId,
      areaId: facility?.areaId ?? prev.areaId,
      coordinates: facility?.coords ?? prev.coordinates,
    }));
  }, [facilityId, facilities]);

  const update = (partial: Partial<TicketFormData>) => setForm((prev) => ({ ...prev, ...partial }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await submitTicket(form);
    if ("error" in result) {
      setSubmitting(false);
      setError(result.error);
      return;
    }
    const success = result;
    setSubmitting(false);
    setToast(`已建立工單 ${success.id}，狀態 ${success.status}`);
    setTimeout(() => setToast(null), 1500);
    close();
  };

  return (
    <Drawer open={isOpen} onClose={close} title="回報問題 / Report issue">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="text-sm text-slate-300">關聯設施</label>
          <Select
            value={form.facilityId ?? ""}
            onChange={(e) => {
              const newFacilityId = e.target.value || undefined;
              const facility = facilities.find((f) => f.id === newFacilityId);
              update({ facilityId: newFacilityId, areaId: facility?.areaId ?? form.areaId, coordinates: facility?.coords });
            }}
          >
            <option value="">未指定</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
          {selectedFacility?.areaId && (
            <p className="text-xs text-slate-400 pt-1">屬於：{areas.find((a) => a.id === selectedFacility.areaId)?.name ?? selectedFacility.areaId}</p>
          )}
        </div>

        <div>
          <label className="text-sm text-slate-300">行政區</label>
          <Select value={form.areaId ?? ""} onChange={(e) => update({ areaId: e.target.value })}>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className="text-sm text-slate-300">Issue type</label>
          <Select value={form.issueType} onChange={(e) => update({ issueType: e.target.value })}>
            <option value="safety">Safety</option>
            <option value="maintenance">Maintenance</option>
            <option value="cleaning">Cleaning</option>
          </Select>
        </div>

        <div>
          <label className="text-sm text-slate-300">Severity</label>
          <Select value={form.severity} onChange={(e) => update({ severity: e.target.value as TicketFormData["severity"] })}>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </Select>
        </div>

        <div>
          <label className="text-sm text-slate-300">Description</label>
          <Textarea
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="描述現況、位置"
            required
          />
        </div>

        <div>
          <label className="text-sm text-slate-300">Upload photo (mock)</label>
          <Input type="file" onChange={(e) => update({ photo: e.target.files?.[0] ?? null })} />
        </div>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Submitting..." : "提交"}
        </Button>
        {error && <p className="text-xs text-red-300">{error}</p>}
        {toast && <p className="text-xs text-emerald-300">{toast}</p>}
      </form>
    </Drawer>
  );
}

export default TicketFormDrawer;
