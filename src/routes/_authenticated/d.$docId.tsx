import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, FileText, Link2, MoveRight, Paperclip, Plus, Trash2, Upload } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { useAuth, canEdit } from "@/lib/auth";
import { fetchDocument, fetchAttachments, fetchTree, buildBreadcrumb, statusLabels } from "@/lib/knowledge";
import { fetchEmbeds } from "@/lib/demos";
import { detectProvider } from "@/lib/media";
import { MediaPreview } from "@/components/media/MediaPreview";
import { EmbedView } from "@/components/media/EmbedView";
import { MoveNodeDialog } from "@/components/knowledge/MoveNodeDialog";
import { updateDocument, deleteDocument } from "@/lib/knowledge.functions";
import { KnowledgeShell } from "@/components/knowledge/KnowledgeShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/d/$docId")({
  head: ({ params }) => ({
    meta: [
      { title: "Document — Knowledge Center" },
      { name: "description", content: "View and edit a knowledge base document." },
      { property: "og:title", content: "Document — Knowledge Center" },
      { property: "og:description", content: "View and edit a knowledge base document." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <KnowledgeShell>
      <div className="p-10 text-center">
        <h1 className="font-display text-xl font-semibold">Document not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been moved or you don't have access.
        </p>
      </div>
    </KnowledgeShell>
  ),
  notFoundComponent: () => (
    <KnowledgeShell>
      <div className="p-10 text-center">
        <h1 className="font-display text-xl font-semibold">Document not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been moved or you don't have access.
        </p>
      </div>
    </KnowledgeShell>
  ),
  component: DocumentPage,
});

function formatBytes(n: number | null) {
  if (n == null) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = n;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

function DocumentPage() {
  const { docId } = Route.useParams();
  const { role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editable = canEdit(role);
  const updateDocFn = useServerFn(updateDocument);
  const deleteDocFn = useServerFn(deleteDocument);

  const docQuery = useQuery({
    queryKey: ["document", docId],
    queryFn: () => fetchDocument(docId),
  });
  const attachmentsQuery = useQuery({
    queryKey: ["attachments", docId],
    queryFn: () => fetchAttachments(docId),
  });
  const embedsQuery = useQuery({
    queryKey: ["embeds", docId],
    queryFn: () => fetchEmbeds(docId),
  });
  const treeQuery = useQuery({ queryKey: ["tree"], queryFn: fetchTree });
  const doc = docQuery.data;

  const [moveOpen, setMoveOpen] = useState(false);
  const [embedUrl, setEmbedUrl] = useState("");
  const [embedTitle, setEmbedTitle] = useState("");
  const [addingEmbed, setAddingEmbed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc?.title ?? "");
  const [content, setContent] = useState(doc?.content ?? "");
  const [status, setStatus] = useState(doc?.status ?? "draft");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setContent(doc.content);
      setStatus(doc.status);
    }
  }, [doc?.id, doc?.title, doc?.content, doc?.status]);

  const breadcrumb = useMemo(() => {
    const folders = treeQuery.data?.allFolders ?? [];
    return buildBreadcrumb(doc?.folder_id ?? null, folders);
  }, [doc, treeQuery.data]);

  const doSave = async () => {
    setSaving(true);
    try {
      await updateDocFn({ data: { id: docId, title, content, status } });
      await queryClient.invalidateQueries({ queryKey: ["document", docId] });
      await queryClient.invalidateQueries({ queryKey: ["tree"] });
      setEditing(false);
      toast.success("Saved");
    } catch (error) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!confirm("Delete this document?")) return;
    try {
      await deleteDocFn({ data: { id: docId } });
      await queryClient.invalidateQueries({ queryKey: ["tree"] });
      void navigate({ to: "/" });
      toast.success("Deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const path = `${docId}/${Date.now()}-${file.name}`;
      const { error: upError } = await supabase.storage.from("attachments").upload(path, file);
      if (upError) throw upError;
      const { error: dbError } = await supabase.from("attachments").insert({
        document_id: docId,
        file_name: file.name,
        file_path: path,
        mime_type: file.type,
        size_bytes: file.size,
      });
      if (dbError) throw dbError;
      await queryClient.invalidateQueries({ queryKey: ["attachments", docId] });
      toast.success("Attachment uploaded");
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadUrl = async (path: string) => {
    const { data, error } = await supabase.storage.from("attachments").createSignedUrl(path, 60 * 60);
    if (error || !data) return null;
    return data.signedUrl;
  };

  const addEmbed = async () => {
    const url = embedUrl.trim();
    if (!url) return;
    setAddingEmbed(true);
    try {
      const { error } = await supabase.from("embeds").insert({
        document_id: docId,
        url,
        provider: detectProvider(url),
        title: embedTitle.trim() || null,
        position: (embedsQuery.data?.length ?? 0) + 1,
      });
      if (error) throw error;
      setEmbedUrl("");
      setEmbedTitle("");
      await queryClient.invalidateQueries({ queryKey: ["embeds", docId] });
      toast.success("Embed added");
    } catch (error: any) {
      toast.error(error?.message || "Could not add the embed");
    } finally {
      setAddingEmbed(false);
    }
  };

  const removeEmbed = async (id: string) => {
    const { error } = await supabase.from("embeds").delete().eq("id", id);
    if (error) {
      toast.error("Could not remove the embed");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["embeds", docId] });
  };

  if (!doc && !docQuery.isLoading) throw notFound();
  if (docQuery.isLoading) {
    return <KnowledgeShell><div className="mx-auto max-w-4xl px-4 py-12 text-sm text-muted-foreground sm:px-8">Loading knowledge…</div></KnowledgeShell>;
  }

  return (
    <KnowledgeShell>
      <div className="presentation-grid min-h-full">
      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
        <nav className="flex flex-wrap items-center gap-1 text-xs font-medium text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Knowledge Center</Link>
          {breadcrumb.map((folder) => (
            <span key={folder.id} className="flex items-center gap-1">
              <span>/</span>
              <span>{folder.name}</span>
            </span>
          ))}
        </nav>

        <header className="mt-6 flex flex-col justify-between gap-5 border-b pb-7 sm:flex-row sm:items-start">
          {editing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 text-xl font-semibold"
            />
          ) : (
            <div><p className="mb-2 text-xs font-semibold uppercase text-primary">Project knowledge</p><h1 className="font-display text-3xl font-semibold sm:text-4xl">{doc?.title}</h1></div>
          )}
          {editable && (
            <div className="flex flex-wrap items-center gap-2">
              {editing ? (
                <>
                  <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => void doSave()} disabled={saving}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                   <span className="rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary">
                    {statusLabels[doc?.status ?? "draft"]}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setMoveOpen(true)}>
                    <MoveRight className="mr-1.5 h-3.5 w-3.5" />
                    Move
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => void doDelete()}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          )}
        </header>

        {editing ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-6 min-h-[300px] font-mono text-sm"
          />
        ) : (
          <div className="prose-doc mt-8 max-w-none text-[15px] leading-7">
            {doc?.content ? (
              <ReactMarkdown>{doc.content}</ReactMarkdown>
            ) : (
              <p className="text-sm text-muted-foreground italic">No content yet.</p>
            )}
          </div>
        )}

        <section className="mt-12 border-t pt-7">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Paperclip className="h-4 w-4 text-primary" />
            Attachments
          </h2>
          {editable && (
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs font-medium hover:bg-muted">
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading..." : "Upload file"}
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                  e.target.value = "";
                }}
              />
            </label>
          )}
          <div className="mt-4 divide-y overflow-hidden rounded-xl border bg-card shadow-soft">
            {(attachmentsQuery.data ?? []).map((att) => (
              <AttachmentRow key={att.id} attachment={att} downloadUrl={downloadUrl} />
            ))}
            {(attachmentsQuery.data ?? []).length === 0 && (
              <div className="px-4 py-3 text-sm text-muted-foreground">No attachments</div>
            )}
          </div>
        </section>

        <section className="mt-12 border-t pt-7">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Link2 className="h-4 w-4 text-primary" />
            Boards, dashboards & videos
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Paste a Miro, Figma, YouTube, Vimeo, Loom, Google Docs/Sheets/Slides or Power BI link.
          </p>
          {editable && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                placeholder="https://..."
                className="h-9 flex-1 text-sm"
              />
              <Input
                value={embedTitle}
                onChange={(e) => setEmbedTitle(e.target.value)}
                placeholder="Label (optional)"
                className="h-9 text-sm sm:w-48"
              />
              <Button size="sm" className="h-9" onClick={() => void addEmbed()} disabled={addingEmbed}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          )}
          <div className="mt-4 space-y-4">
            {(embedsQuery.data ?? []).map((embed) => (
              <div key={embed.id}>
                <EmbedView url={embed.url} title={embed.title} />
                {editable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1 h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => void removeEmbed(embed.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {(embedsQuery.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing embedded yet.</p>
            )}
          </div>
        </section>
      </article></div>

      {doc && (
        <MoveNodeDialog
          open={moveOpen}
          onOpenChange={setMoveOpen}
          kind="document"
          nodeId={doc.id}
          currentParentId={doc.folder_id}
          folders={treeQuery.data?.allFolders ?? []}
          onMoved={() => void queryClient.invalidateQueries({ queryKey: ["document", docId] })}
        />
      )}
    </KnowledgeShell>
  );
}

function AttachmentRow({
  attachment,
  downloadUrl,
}: {
  attachment: Awaited<ReturnType<typeof fetchAttachments>>[number];
  downloadUrl: (path: string) => Promise<string | null>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const togglePreview = async () => {
    if (!open && !url) {
      const u = await downloadUrl(attachment.file_path);
      setUrl(u);
    }
    setOpen((o) => !o);
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => void togglePreview()}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{attachment.file_name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatBytes(attachment.size_bytes)}
          </span>
        </button>
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            const u = url ?? (await downloadUrl(attachment.file_path));
            if (u) window.open(u, "_blank");
          }}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
      {open && (
        <div className="mt-3">
          <MediaPreview
            fileName={attachment.file_name}
            mimeType={attachment.mime_type}
            url={url}
          />
        </div>
      )}
    </div>
  );
}
