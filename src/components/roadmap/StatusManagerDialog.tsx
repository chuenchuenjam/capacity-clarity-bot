import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_COLORS, colorClasses, type StatusRow } from "@/lib/roadmap";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function StatusManagerDialog({
  open,
  onOpenChange,
  statuses,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: StatusRow[];
}) {
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState<string>("emerald");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["roadmap-statuses"] });
    await queryClient.invalidateQueries({ queryKey: ["roadmap-initiatives"] });
  };

  const add = async () => {
    if (!newLabel.trim()) {
      toast.error("Name the status first");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("roadmap_statuses").insert({
        label: newLabel.trim(),
        color: newColor,
        position: statuses.length,
      });
      if (error) throw error;
      setNewLabel("");
      await refresh();
      toast.success("Status added");
    } catch (error: any) {
      toast.error(error?.message || "Could not add the status");
    } finally {
      setBusy(false);
    }
  };

  const update = async (id: string, patch: { label?: string; color?: string }) => {
    const { error } = await supabase.from("roadmap_statuses").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("roadmap_statuses").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    toast.success("Status removed");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Manage stages</DialogTitle>
          <DialogDescription>
            Add, rename, recolour or remove the stage labels used across the roadmap.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {statuses.map((status) => (
            <div key={status.id} className="flex items-center gap-2 rounded-lg border p-2">
              <span className={`h-3 w-3 shrink-0 rounded-full ${colorClasses(status.color).dot}`} />
              <Input
                defaultValue={status.label}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && value !== status.label) void update(status.id, { label: value });
                }}
                className="h-9 flex-1"
              />
              <Select value={status.color} onValueChange={(value) => void update(status.id, { color: value })}>
                <SelectTrigger className="h-9 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_COLORS.map((color) => (
                    <SelectItem key={color.key} value={color.key}>
                      {color.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-muted-foreground"
                onClick={() => void remove(status.id)}
                aria-label={`Remove ${status.label}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {statuses.length === 0 && (
            <p className="text-sm text-muted-foreground">No stages yet — add the first one below.</p>
          )}
        </div>

        <div className="mt-2 space-y-2 rounded-lg border border-dashed p-3">
          <Label htmlFor="new-status">New stage</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="new-status"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. On hold"
              className="h-9 flex-1"
            />
            <Select value={newColor} onValueChange={setNewColor}>
              <SelectTrigger className="h-9 sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_COLORS.map((color) => (
                  <SelectItem key={color.key} value={color.key}>
                    {color.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="h-9" onClick={() => void add()} disabled={busy}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
