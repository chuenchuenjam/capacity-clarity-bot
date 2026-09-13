import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { updateFolder } from "@/lib/knowledge.functions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FolderSettingsDialog({
  open,
  onOpenChange,
  folder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderRow | undefined;
}) {
  const [name, setName] = useState("");
  const [accessLevel, setAccessLevel] = useState<"public" | "internal" | "restricted">("internal");
  const [badge, setBadge] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const updateFolderFn = useServerFn(updateFolder);

  useEffect(() => {
    if (open && folder) {
      setName(folder.name);
      setAccessLevel(folder.access_level as "public" | "internal" | "restricted");
      setBadge(folder.badge ?? "");
    }
  }, [open, folder?.id]);

  const submit = async () => {
    if (!folder) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Please enter a section name");
      return;
    }
    setSaving(true);
    try {
      await updateFolderFn({
        data: {
          id: folder.id,
          name: trimmed,
          access_level: accessLevel,
          badge: badge.trim() || null,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["tree"] });
      onOpenChange(false);
      toast.success("Section updated");
    } catch {
      toast.error("Could not update the section");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Section settings</DialogTitle>
          <DialogDescription>
            Rename this section and change how it is labelled and who can see it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="folder-name">Section name</Label>
            <Input id="folder-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label>Access level</Label>
            <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as typeof accessLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="restricted">Restricted (admins only)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="folder-badge">Label</Label>
            <Input
              id="folder-badge"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="e.g. New, Internal, Restricted"
            />
            <p className="text-xs text-muted-foreground">Leave blank to show no label.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
