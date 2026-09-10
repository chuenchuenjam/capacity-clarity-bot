import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DemoRow } from "@/lib/demos";
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

export function DemoDialog({
  open,
  onOpenChange,
  demo,
  nextPosition,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demo: DemoRow | null;
  nextPosition: number;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(demo?.title ?? "");
    setDescription(demo?.description ?? "");
    setTag(demo?.tag ?? "");
    setProductUrl(demo?.product_url ?? "");
    setVideoUrl(demo?.video_url ?? "");
    setThumbnailUrl(demo?.thumbnail_url ?? "");
    setFile(null);
  }, [open, demo]);

  const save = async () => {
    if (!title.trim()) {
      toast.error("Give the demo a title");
      return;
    }
    setSaving(true);
    try {
      let videoPath = demo?.video_path ?? null;
      if (file) {
        const path = `${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error } = await supabase.storage.from("demos").upload(path, file);
        if (error) throw error;
        videoPath = path;
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        tag: tag.trim() || null,
        product_url: productUrl.trim() || null,
        video_url: videoUrl.trim() || null,
        thumbnail_url: thumbnailUrl.trim() || null,
        video_path: videoPath,
      };

      if (demo) {
        const { error } = await supabase.from("demos").update(payload).eq("id", demo.id);
        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("demos")
          .insert({ ...payload, position: nextPosition, created_by: userData.user?.id ?? null });
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ["demos"] });
      onOpenChange(false);
      toast.success(demo ? "Demo updated" : "Demo added");
    } catch (error: any) {
      toast.error(error?.message || "Could not save the demo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{demo ? "Edit demo" : "Add a product demo"}</DialogTitle>
          <DialogDescription>
            Upload a video file or paste a link, then describe what the demo shows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="demo-title">Title</Label>
            <Input id="demo-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-desc">Description</Label>
            <Textarea
              id="demo-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="demo-tag">Tag</Label>
              <Input
                id="demo-tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Claims, Underwriting…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="demo-product">Product link</Label>
              <Input
                id="demo-product"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="demo-video-url">Video link</Label>
            <Input
              id="demo-video-url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="YouTube, Vimeo, Loom or SharePoint link"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="demo-file">Or upload a video file</Label>
            <Input
              id="demo-file"
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {demo?.video_path && !file && (
              <p className="text-xs text-muted-foreground">Current file: {demo.video_path}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="demo-thumb">Thumbnail image link (optional)</Label>
            <Input
              id="demo-thumb"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://…"
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
