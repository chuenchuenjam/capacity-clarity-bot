import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ChevronRight, FileText, Folder, Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { FolderNode, DocumentRow, AccessLevel } from "@/lib/knowledge";

function BadgeChip({ value }: { value: string | null }) {
  if (!value) return null;
  const variant =
    value.toLowerCase() === "restricted"
      ? "destructive"
      : value.toLowerCase() === "internal"
        ? "secondary"
        : value.toLowerCase() === "new"
          ? "default"
          : "outline";
  return (
    <Badge variant={variant as never} className="ml-2 h-4 px-1 text-[10px] font-normal">
      {value}
    </Badge>
  );
}

function AccessIcon({ level }: { level: AccessLevel }) {
  if (level === "restricted") return <Lock className="mr-1.5 h-3 w-3 text-destructive" />;
  return null;
}

function DocRow({ doc, depth }: { doc: DocumentRow; depth: number }) {
  const { docId } = useParams({ strict: false });
  const active = docId === doc.id;

  return (
    <Link
      to="/d/$docId"
      params={{ docId: doc.id }}
      className={cn(
        "group flex w-full items-center rounded-md py-1.5 pr-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
      style={{ paddingLeft: `${depth * 14 + 24}px` }}
    >
      <FileText className="mr-2 h-3.5 w-3.5 shrink-0 text-sidebar-foreground/60" />
      <span className="truncate">{doc.title}</span>
      <BadgeChip value={doc.badge} />
    </Link>
  );
}

function FolderBranch({
  node,
  depth = 0,
  onAddPage,
}: {
  node: FolderNode;
  depth?: number;
  onAddPage?: (folderId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0 || node.documents.length > 0;

  return (
    <div>
      <div
        className={cn(
          "group flex w-full items-center rounded-md pr-1 text-sm font-medium transition-colors",
          "text-sidebar-foreground hover:bg-sidebar-accent/50",
        )}
      >
        <button
          type="button"
          onClick={() => hasChildren && setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center py-1.5 text-left"
          style={{ paddingLeft: `${depth * 14 + 12}px` }}
        >
          <ChevronRight
            className={cn(
              "mr-1 h-3.5 w-3.5 shrink-0 transition-transform",
              open && "rotate-90",
              !hasChildren && "invisible",
            )}
          />
          <AccessIcon level={node.access_level} />
          <Folder className="mr-2 h-3.5 w-3.5 shrink-0 text-sidebar-foreground/60" />
          <span className="truncate">{node.name}</span>
          <BadgeChip value={node.badge} />
        </button>
        {onAddPage && (
          <button
            type="button"
            aria-label={`Add page in ${node.name}`}
            title="Add page here"
            onClick={(e) => {
              e.stopPropagation();
              onAddPage(node.id);
            }}
            className="shrink-0 rounded p-1 text-sidebar-foreground/50 opacity-0 transition hover:bg-sidebar-accent hover:text-sidebar-foreground group-hover:opacity-100"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="mt-0.5">
          {node.children.map((child) => (
            <FolderBranch key={child.id} node={child} depth={depth + 1} onAddPage={onAddPage} />
          ))}
          {node.documents.map((doc) => (
            <DocRow key={doc.id} doc={doc} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function KnowledgeTree({
  tree,
  search,
}: {
  tree: { folders: FolderNode[]; rootDocuments: DocumentRow[] };
  search: string;
}) {
  const q = search.trim().toLowerCase();

  const matchesFolder = (node: FolderNode): boolean => {
    if (!q) return true;
    if (node.name.toLowerCase().includes(q)) return true;
    return node.children.some(matchesFolder) || node.documents.some(matchesDoc);
  };

  const matchesDoc = (doc: DocumentRow): boolean => {
    if (!q) return true;
    return doc.title.toLowerCase().includes(q) || doc.content.toLowerCase().includes(q);
  };

  const filteredFolders = tree.folders.filter(matchesFolder);

  return (
    <div className="space-y-1 px-2 pb-4">
      {filteredFolders.map((folder) => (
        <FolderBranch key={folder.id} node={folder} />
      ))}
      {tree.rootDocuments.filter(matchesDoc).map((doc) => (
        <DocRow key={doc.id} doc={doc} depth={0} />
      ))}
      {filteredFolders.length === 0 && tree.rootDocuments.filter(matchesDoc).length === 0 && q && (
        <div className="px-3 py-4 text-xs text-sidebar-foreground/50">No results</div>
      )}
    </div>
  );
}
