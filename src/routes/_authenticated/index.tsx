import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Folder, Clock, Inbox } from "lucide-react";
import { KnowledgeShell } from "@/components/knowledge/KnowledgeShell";
import { fetchTree, statusLabels } from "@/lib/knowledge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Knowledge Center" },
      { name: "description", content: "AI team documentation hub with searchable projects, documents, and an assistant for leaders." },
      { property: "og:title", content: "Knowledge Center" },
      { property: "og:description", content: "AI team documentation hub with searchable projects, documents, and an assistant for leaders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function HomePage() {
  const { data } = useQuery({ queryKey: ["tree"], queryFn: fetchTree });
  const docs = data?.allDocuments ?? [];
  const folders = data?.allFolders ?? [];
  const recent = [...docs].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 8);

  const draftCount = docs.filter((d) => d.status === "draft").length;
  const reviewCount = docs.filter((d) => d.status === "in_review").length;
  const publishedCount = docs.filter((d) => d.status === "published").length;

  return (
    <KnowledgeShell>
      <div className="p-8">
        <h1 className="font-display text-2xl font-semibold">Welcome to the Knowledge Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse projects and documents from the sidebar, or ask the assistant for a quick status update.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Folders" value={folders.length} icon={Folder} />
          <StatCard label="Documents" value={docs.length} icon={FileText} />
          <StatCard label="Drafts" value={draftCount} icon={Inbox} />
          <StatCard label="In Review" value={reviewCount} icon={Clock} />
        </div>

        <h2 className="mt-8 font-display text-lg font-medium">Recently updated</h2>
        <div className="mt-3 divide-y rounded-lg border">
          {recent.map((doc) => (
            <Link
              key={doc.id}
              to="/d/$docId"
              params={{ docId: doc.id }}
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{doc.title}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  {statusLabels[doc.status]}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(doc.updated_at))} ago
              </span>
            </Link>
          ))}
          {recent.length === 0 && (
            <div className="px-4 py-6 text-sm text-muted-foreground">No documents yet.</div>
          )}
        </div>
      </div>
    </KnowledgeShell>
  );
}
