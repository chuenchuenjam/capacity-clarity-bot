import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bot, BookOpen, FilePlus, FolderPlus, LogOut, Menu, Search, Shield, User } from "lucide-react";
import { AddNodeDialog, type AddNodeMode } from "./AddNodeDialog";
import { MoveNodeDialog } from "./MoveNodeDialog";
import { FolderSettingsDialog } from "./FolderSettingsDialog";

import { useAuth, canEdit } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { fetchTree } from "@/lib/knowledge";
import { KnowledgeTree } from "./KnowledgeTree";
import { ChatPanel } from "./ChatPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function filterTree(tree: Awaited<ReturnType<typeof fetchTree>>, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return tree;
  return {
    ...tree,
    folders: tree.folders.filter((folder) => {
      const folderMatch = folder.name.toLowerCase().includes(q);
      const childMatch = folder.children.some(
        (c) => c.name.toLowerCase().includes(q) || c.documents.some((d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)),
      );
      const docMatch = folder.documents.some(
        (d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q),
      );
      return folderMatch || childMatch || docMatch;
    }),
  };
}

export function KnowledgeShell({ children }: { children: React.ReactNode }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddNodeMode>("page");
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [moveFolderId, setMoveFolderId] = useState<string | null>(null);
  const [editFolderId, setEditFolderId] = useState<string | null>(null);

  const treeQuery = useQuery({ queryKey: ["tree"], queryFn: fetchTree });
  const editable = canEdit(role);

  const filtered = treeQuery.data ? filterTree(treeQuery.data, search) : { folders: [], rootDocuments: [] };

  const openAdd = (mode: AddNodeMode, parentId: string | null) => {
    setAddMode(mode);
    setAddParentId(parentId);
    setAddOpen(true);
  };

  const sidebar = (
      <div className="flex h-full flex-col knowledge-sidebar">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-display text-sm font-semibold text-sidebar-foreground">Knowledge Center</h1>
            <p className="text-[10px] text-sidebar-foreground/60">Team Documentation</p>
          </div>
        </div>

        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sidebar-foreground/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-8 border-sidebar-border/30 bg-sidebar/50 pl-8 text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-sidebar-ring"
            />
          </div>
        </div>

        {editable && (
          <div className="flex gap-1.5 px-3 pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openAdd("page", treeQuery.data?.allFolders?.[0]?.id ?? null)}
              className="h-7 flex-1 text-xs text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              <FilePlus className="mr-1.5 h-3 w-3" />
              New page
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openAdd("folder", null)}
              className="h-7 flex-1 text-xs text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              <FolderPlus className="mr-1.5 h-3 w-3" />
              New section
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {treeQuery.isLoading ? (
            <div className="px-4 py-6 text-xs text-sidebar-foreground/50">Loading...</div>
          ) : (
            <KnowledgeTree
              tree={filtered}
              search={search}
              {...(editable
                ? {
                    onAddPage: (folderId: string) => openAdd("page", folderId),
                    onMoveFolder: (folderId: string) => setMoveFolderId(folderId),
                    onEditFolder: (folderId: string) => setEditFolderId(folderId),
                  }
                : {})}
            />

          )}
        </div>

        <div className="border-t border-sidebar-border/30 p-3">
          <div className="flex items-center gap-2 rounded-md bg-sidebar-accent/40 px-2 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-sidebar-foreground">
                {user?.email ?? "Guest"}
              </p>
              <p className="text-[10px] capitalize text-sidebar-foreground/60">{role ?? "—"}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {role === "admin" && (
              <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs text-sidebar-foreground hover:bg-sidebar-accent/50" asChild>
                <Link to="/admin">
                  <Shield className="mr-1.5 h-3 w-3" />
                  Admin
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void signOut().then(() => navigate({ to: "/auth" }))}
              className="h-7 flex-1 text-xs text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              <LogOut className="mr-1.5 h-3 w-3" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border lg:block">{sidebar}</aside>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-[86vw] max-w-80 border-0 p-0">{sidebar}</SheetContent>
      </Sheet>

      <main className="relative flex min-w-0 flex-1 flex-col bg-background">
        <div className="flex h-16 items-center justify-between border-b border-border/70 bg-card/80 px-4 backdrop-blur-xl lg:justify-end lg:px-6">
          <Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <Button onClick={() => setChatOpen(true)} className="gap-2 rounded-full px-5 shadow-lg shadow-primary/20">
            <Bot className="h-4 w-4" />
            Ask AI
          </Button>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </main>

      <AddNodeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode={addMode}
        defaultParentId={addParentId}
        folders={treeQuery.data?.allFolders ?? []}
      />

      {moveFolderId && (
        <MoveNodeDialog
          open={!!moveFolderId}
          onOpenChange={(o) => !o && setMoveFolderId(null)}
          kind="folder"
          nodeId={moveFolderId}
          currentParentId={
            treeQuery.data?.allFolders?.find((f) => f.id === moveFolderId)?.parent_id ?? null
          }
          folders={treeQuery.data?.allFolders ?? []}
        />
      )}

      {editFolderId && (
        <FolderSettingsDialog
          open={!!editFolderId}
          onOpenChange={(o) => !o && setEditFolderId(null)}
          folder={treeQuery.data?.allFolders?.find((f) => f.id === editFolderId)}
        />
      )}


      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent className="w-full border-l border-border/60 p-0 sm:max-w-[560px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3 border-b px-6 py-5 text-base">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Bot className="h-4 w-4" /></span>
              Knowledge Assistant
            </SheetTitle>
          </SheetHeader>
          <ChatPanel onNavigated={() => setChatOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
