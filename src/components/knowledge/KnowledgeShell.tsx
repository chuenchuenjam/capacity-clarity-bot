import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, LogOut, MessageSquare, Search, Shield, User, X } from "lucide-react";
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
  const treeQuery = useQuery({ queryKey: ["tree"], queryFn: fetchTree });

  const filtered = treeQuery.data ? filterTree(treeQuery.data, search) : { folders: [], rootDocuments: [] };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <aside className="flex w-72 shrink-0 flex-col knowledge-sidebar">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
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

        <div className="flex-1 overflow-y-auto">
          {treeQuery.isLoading ? (
            <div className="px-4 py-6 text-xs text-sidebar-foreground/50">Loading...</div>
          ) : (
            <KnowledgeTree tree={filtered} search={search} />
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
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col bg-background">
        <div className="flex items-center justify-end border-b border-border px-4 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setChatOpen(true)}
            className="gap-1.5 text-xs"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Ask assistant
          </Button>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </main>

      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent className="w-[420px] sm:max-w-[420px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4" />
              Knowledge Assistant
            </SheetTitle>
          </SheetHeader>
          <ChatPanel />
        </SheetContent>
      </Sheet>
    </div>
  );
}
