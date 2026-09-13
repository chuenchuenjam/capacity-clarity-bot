import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createDocument, createFolder } from "@/lib/knowledge.functions";
import type { FolderRow } from "@/lib/knowledge";
import { defaultPageContent } from "@/lib/page-template";

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

export type AddNodeMode = "page" | "folder";

const ROOT = "__root__";

export function AddNodeDialog({
  open,
  onOpenChange,
  mode,
  defaultParentId,
  folders,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AddNodeMode;
  defaultParentId: string | null;
  folders: FolderRow[];
}) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>(defaultParentId ?? ROOT);
  const [accessLevel, setAccessLevel] = useState<"public" | "internal" | "restricted">("internal");
  const [badge, setBadge] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const createDocumentFn = useServerFn(createDocument);
  const createFolderFn = useServerFn(createFolder);

  useEffect(() => {
    if (open) {
      setName("");
      setParentId(defaultParentId ?? ROOT);
      setAccessLevel("internal");
      setBadge("");
    }
  }, [open, defaultParentId]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Please enter a name");
      return;
    }
    if (mode === "page" && parentId === ROOT) {
      toast.error("Pick a section for this page");
      return;
    }
    setSaving(true);
    try {
      if (mode === "page") {
        const created = await createDocumentFn({
          data: {
            folder_id: parentId,
            title: trimmed,
            content: defaultPageContent(),
            status: "draft",
          },
        });
        await queryClient.invalidateQueries({ queryKey: ["tree"] });
        onOpenChange(false);
        toast.success("Page created");
        if (created?.id) navigate({ to: "/d/$docId", params: { docId: created.id } });
      } else {
        await createFolderFn({
          data: {
            parent_id: parentId === ROOT ? null : parentId,
            name: trimmed,
            access_level: accessLevel,
            badge: badge.trim() || null,
          },
        });
        await queryClient.invalidateQueries({ queryKey: ["tree"] });
        onOpenChange(false);
        toast.success("Section created");
      }
    } catch {
      toast.error(mode === "page" ? "Could not create the page" : "Could not create the section");
    } finally {
      setSaving(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "page" ? "New page" : "New section"}</DialogTitle>
          <DialogDescription>
            {mode === "page"
              ? "Add a page inside a section of the navigation tree."
              : "Add a section (folder) to the navigation tree."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="node-name">{mode === "page" ? "Page title" : "Section name"}</Label>
            <Input
              id="node-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === "page" ? "Getting started" : "Product Library"}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>{mode === "page" ? "Section" : "Parent section"}</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a section" />
              </SelectTrigger>
              <SelectContent>
                {mode === "folder" && <SelectItem value={ROOT}>Top level</SelectItem>}
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
