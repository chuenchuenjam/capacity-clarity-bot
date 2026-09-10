import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { FolderRow } from "@/lib/knowledge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROOT = "__root__";

function descendantIds(folders: FolderRow[], rootId: string): Set<string> {
  const out = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of folders) {
      if (f.parent_id && out.has(f.parent_id) && !out.has(f.id)) {
        out.add(f.id);
        changed = true;
      }
    }
  }
  return out;
}

function labelPath(folders: FolderRow[], folder: FolderRow): string {
  const map = new Map(folders.map((f) => [f.id, f]));
  const parts: string[] = [];
  let cur: FolderRow | undefined = folder;
  while (cur) {
    parts.unshift(cur.name);
    cur = cur.parent_id ? map.get(cur.parent_id) : undefined;
  }
  return parts.join(" / ");
}

export function MoveNodeDialog({
  open,
  onOpenChange,
  kind,
  nodeId,
  currentParentId,
  folders,
  onMoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "document" | "folder";
  nodeId: string;
  currentParentId: string | null;
  folders: FolderRow[];
  onMoved?: () => void;
}) {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<string>(currentParentId ?? ROOT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setTarget(currentParentId ?? ROOT);
  }, [open, currentParentId]);

  const blocked = kind === "folder" ? descendantIds(folders, nodeId) : new Set<string>();
  const options = folders.filter((f) => !blocked.has(f.id));

  const move = async () => {
    if (kind === "document" && target === ROOT) {
      toast.error("Pick a section for this page");
      return;
    }
    setSaving(true);
    try {
      if (kind === "document") {
        const { error } = await supabase.from("documents").update({ folder_id: target }).eq("id", nodeId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("folders")
          .update({ parent_id: target === ROOT ? null : target })
          .eq("id", nodeId);
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ["tree"] });
      onOpenChange(false);
      onMoved?.();
      toast.success("Moved");
    } catch (error: any) {
      toast.error(error?.message || "Could not move it");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{kind === "document" ? "Move page" : "Move section"}</DialogTitle>
          <DialogDescription>
            Choose where it should live in the navigation tree.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label>Destination</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a section" />
            </SelectTrigger>
            <SelectContent>
              {kind === "folder" && <SelectItem value={ROOT}>Top level</SelectItem>}
              {options.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {labelPath(folders, f)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void move()} disabled={saving}>
            {saving ? "Moving…" : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
