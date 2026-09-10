import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, GripVertical, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchDemos, signedUrl, type DemoRow } from "@/lib/demos";
import { toEmbedUrl } from "@/lib/media";
import { useAuth, canEdit } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DemoDialog } from "./DemoDialog";

function DemoPlayer({ demo }: { demo: DemoRow }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (demo.video_path) {
      void signedUrl("demos", demo.video_path).then((u) => {
        if (active) setUrl(u);
      });
    }
    return () => {
      active = false;
    };
  }, [demo.video_path]);

  if (demo.video_path) {
    return url ? (
      <video src={url} controls autoPlay className="w-full rounded-md bg-black" />
    ) : (
      <div className="flex h-64 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
        Loading video…
      </div>
    );
  }
  if (demo.video_url) {
    const embed = toEmbedUrl(demo.video_url);
    if (embed) {
      return (
        <iframe
          title={demo.title}
          src={embed}
          className="aspect-video w-full rounded-md bg-black"
          allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
        />
      );
    }
    return (
      <a
        href={demo.video_url}
        target="_blank"
        rel="noreferrer"
        className="flex h-40 items-center justify-center rounded-md border text-sm font-medium hover:bg-muted"
      >
        Open video <ExternalLink className="ml-2 h-4 w-4" />
      </a>
    );
  }
  return (
    <div className="flex h-40 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
      No video yet
    </div>
  );
}

function DemoTile({
  demo,
  editable,
  onOpen,
  onEdit,
  onDelete,
}: {
  demo: DemoRow;
  editable: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: demo.id,
    disabled: !editable,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left"
        aria-label={`Play ${demo.title}`}
      >
        <div className="relative flex aspect-video items-center justify-center bg-muted">
          {demo.thumbnail_url ? (
            <img src={demo.thumbnail_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Play className="h-10 w-10 text-muted-foreground/50" />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
            <Play className="h-9 w-9 text-white opacity-0 transition-opacity group-hover:opacity-100" />
          </span>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-sm font-semibold">{demo.title}</h3>
            {demo.tag && (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {demo.tag}
              </span>
            )}
          </div>
          {demo.description && (
            <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{demo.description}</p>
          )}
        </div>
      </button>

      {demo.product_url && (
        <a
          href={demo.product_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 border-t px-4 py-2 text-xs font-medium text-primary hover:bg-muted/50"
        >
          Open product <ExternalLink className="h-3 w-3" />
        </a>
      )}

      {editable && (
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className="cursor-grab rounded bg-background/90 p-1 shadow-sm"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit demo"
            className="rounded bg-background/90 p-1 shadow-sm"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete demo"
            className="rounded bg-background/90 p-1 text-destructive shadow-sm"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export function DemoGallery() {
  const { role } = useAuth();
  const editable = canEdit(role);
  const queryClient = useQueryClient();
  const demosQuery = useQuery({ queryKey: ["demos"], queryFn: fetchDemos });
  const [items, setItems] = useState<DemoRow[]>([]);
  const [playing, setPlaying] = useState<DemoRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<DemoRow | null>(null);

  useEffect(() => {
    if (demosQuery.data) setItems(demosQuery.data);
  }, [demosQuery.data]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const nextPosition = useMemo(
    () => items.reduce((max, d) => Math.max(max, d.position), 0) + 1,
    [items],
  );

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    try {
      await Promise.all(
        next.map((d, i) => supabase.from("demos").update({ position: i }).eq("id", d.id)),
      );
      await queryClient.invalidateQueries({ queryKey: ["demos"] });
    } catch {
      toast.error("Could not save the new order");
    }
  };

  const remove = async (demo: DemoRow) => {
    if (!confirm(`Delete "${demo.title}"?`)) return;
    const { error } = await supabase.from("demos").delete().eq("id", demo.id);
    if (error) {
      toast.error("Could not delete the demo");
      return;
    }
    if (demo.video_path) await supabase.storage.from("demos").remove([demo.video_path]);
    await queryClient.invalidateQueries({ queryKey: ["demos"] });
    toast.success("Demo deleted");
  };

  return (
    <section>
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-lg font-medium">Product demos</h2>
          <p className="text-sm text-muted-foreground">
            Watch what the team has built. {editable && "Drag a tile to rearrange."}
          </p>
        </div>
        {editable && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setEditOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add demo
          </Button>
        )}
      </div>

      {demosQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading demos…</p>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No demos yet.{editable ? " Add the first one." : ""}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onDragEnd(e)}>
          <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((demo) => (
                <DemoTile
                  key={demo.id}
                  demo={demo}
                  editable={editable}
                  onOpen={() => setPlaying(demo)}
                  onEdit={() => {
                    setEditing(demo);
                    setEditOpen(true);
                  }}
                  onDelete={() => void remove(demo)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={!!playing} onOpenChange={(o) => !o && setPlaying(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{playing?.title}</DialogTitle>
          </DialogHeader>
          {playing && <DemoPlayer demo={playing} />}
          {playing?.description && (
            <p className="text-sm text-muted-foreground">{playing.description}</p>
          )}
          {playing?.product_url && (
            <Button asChild size="sm" className="w-fit">
              <a href={playing.product_url} target="_blank" rel="noreferrer">
                Open product <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <DemoDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        demo={editing}
        nextPosition={nextPosition}
      />
    </section>
  );
}
