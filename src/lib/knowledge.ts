import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AccessLevel = "public" | "internal" | "restricted";
export type DocStatus = "draft" | "in_review" | "published";
export type AppRole = "admin" | "editor" | "viewer";

export type FolderRow = Database["public"]["Tables"]["folders"]["Row"];
export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
export type AttachmentRow = Database["public"]["Tables"]["attachments"]["Row"];

export type FolderNode = FolderRow & {
  children: FolderNode[];
  documents: DocumentRow[];
};

export type KnowledgeTree = {
  folders: FolderNode[];
  rootDocuments: DocumentRow[];
  allFolders: FolderRow[];
  allDocuments: DocumentRow[];
};

export const statusLabels: Record<DocStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  published: "Published",
};

export const accessLabels: Record<AccessLevel, string> = {
  public: "Public",
  internal: "Internal",
  restricted: "Restricted",
};

export async function fetchTree(): Promise<KnowledgeTree> {
  const [{ data: folders }, { data: documents }] = await Promise.all([
    supabase.from("folders").select("*").order("position"),
    supabase.from("documents").select("*").order("position"),
  ]);

  const allFolders = (folders as FolderRow[] | null) ?? [];
  const allDocuments = (documents as DocumentRow[] | null) ?? [];

  const folderMap = new Map<string, FolderNode>();
  for (const folder of allFolders) {
    folderMap.set(folder.id, { ...folder, children: [], documents: [] });
  }

  const roots: FolderNode[] = [];
  for (const folder of folderMap.values()) {
    if (folder.parent_id && folderMap.has(folder.parent_id)) {
      folderMap.get(folder.parent_id)!.children.push(folder);
    } else {
      roots.push(folder);
    }
  }

  for (const doc of allDocuments) {
    if (doc.folder_id && folderMap.has(doc.folder_id)) {
      folderMap.get(doc.folder_id)!.documents.push(doc);
    }
  }

  const rootDocuments = allDocuments.filter((d) => !d.folder_id || !folderMap.has(d.folder_id));

  return { folders: roots, rootDocuments, allFolders, allDocuments };
}

export async function fetchDocument(id: string): Promise<DocumentRow | null> {
  const { data, error } = await supabase.from("documents").select("*").eq("id", id).single();
  if (error) return null;
  return data as DocumentRow | null;
}

export async function fetchAttachments(documentId: string): Promise<AttachmentRow[]> {
  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as AttachmentRow[] | null) ?? [];
}

export function buildBreadcrumb(
  folderId: string | null,
  allFolders: FolderRow[],
): FolderRow[] {
  const map = new Map(allFolders.map((f) => [f.id, f]));
  const trail: FolderRow[] = [];
  let current = folderId ? map.get(folderId) : undefined;
  while (current) {
    trail.unshift(current);
    current = current.parent_id ? map.get(current.parent_id) : undefined;
  }
  return trail;
}
