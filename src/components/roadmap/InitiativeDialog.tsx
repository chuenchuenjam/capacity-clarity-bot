import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QUARTER_OPTIONS, type InitiativeRow, type StatusRow } from "@/lib/roadmap";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function InitiativeDialog({
  open,
  onOpenChange,
  initiative,
  statuses,
  nextPosition,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initiative: InitiativeRow | null;
  statuses: StatusRow[];
  nextPosition: number;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [stream, setStream] = useState("");
  const [documentsData, setDocumentsData] = useState("");
  const [regionProduct, setRegionProduct] = useState("");
  const [downstreamUse, setDownstreamUse] = useState("");
  const [stageNote, setStageNote] = useState("");
  const [statusId, setStatusId] = useState<string>("");
  const [startPeriod, setStartPeriod] = useState("");
  const [endPeriod, setEndPeriod] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initiative?.title ?? "");
    setStream(initiative?.stream ?? "Data Intake");
    setDocumentsData(initiative?.documents_data ?? "");
    setRegionProduct(initiative?.region_product ?? "");
    setDownstreamUse(initiative?.downstream_use ?? "");
    setStageNote(initiative?.stage_note ?? "");
    setStatusId(initiative?.status_id ?? statuses[0]?.id ?? "");
    setStartPeriod(initiative?.start_period || QUARTER_OPTIONS[4]!);
    setEndPeriod(initiative?.end_period || QUARTER_OPTIONS[7]!);
  }, [open, initiative, statuses]);

  const save = async () => {
    if (!title.trim()) {
      toast.error("Give the project a name");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        stream: stream.trim() || "Data Intake",
        documents_data: documentsData.trim(),
        region_product: regionProduct.trim(),
        downstream_use: downstreamUse.trim(),
        stage_note: stageNote.trim(),
        status_id: statusId || null,
        start_period: startPeriod,
        end_period: endPeriod,
      };
      if (initiative) {
        const { error } = await supabase
          .from("roadmap_initiatives")
          .update(payload)
          .eq("id", initiative.id);
        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase.from("roadmap_initiatives").insert({
          ...payload,
          position: nextPosition,
          created_by: userData.user?.id ?? null,
        });
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ["roadmap-initiatives"] });
      onOpenChange(false);
      toast.success(initiative ? "Project updated" : "Project added");
    } catch (error: any) {
      toast.error(error?.message || "Could not save the project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initiative ? "Edit project" : "Add a project"}</DialogTitle>
          <DialogDescription>
            Describe the initiative, pick its stage and set the quarters it runs across.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="init-title">Initiative</Label>
              <Input id="init-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="init-stream">Workstream</Label>
              <Input
                id="init-stream"
                value={stream}
                onChange={(e) => setStream(e.target.value)}
                placeholder="Underwriting, Claims…"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="init-docs">Documents + data</Label>
            <Textarea
              id="init-docs"
              value={documentsData}
              onChange={(e) => setDocumentsData(e.target.value)}
              className="min-h-20"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="init-region">Region / product</Label>
            <Input
              id="init-region"
              value={regionProduct}
              onChange={(e) => setRegionProduct(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="init-use">Ingestion + downstream use</Label>
            <Textarea
              id="init-use"
              value={downstreamUse}
              onChange={(e) => setDownstreamUse(e.target.value)}
              className="min-h-20"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a stage" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Starts</Label>
              <Select value={startPeriod} onValueChange={setStartPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUARTER_OPTIONS.map((q) => (
                    <SelectItem key={q} value={q}>
                      {q.replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ends</Label>
              <Select value={endPeriod} onValueChange={setEndPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUARTER_OPTIONS.map((q) => (
                    <SelectItem key={q} value={q}>
                      {q.replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="init-note">Stage note</Label>
            <Input
              id="init-note"
              value={stageNote}
              onChange={(e) => setStageNote(e.target.value)}
              placeholder="Professional 360 to be delivered in Nov"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
