import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Bot, FileText, Loader2, Presentation } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { KnowledgeShell } from "@/components/knowledge/KnowledgeShell";
import { DemoGallery } from "@/components/demos/DemoGallery";
import { fetchTree, statusLabels } from "@/lib/knowledge";
import { generateDeck } from "@/lib/deck";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Product Demos — Knowledge Center" },
      {
        name: "description",
        content:
          "Watch AI product demos, browse team documentation, and ask the assistant for a status summary or a ready-made deck.",
      },
      { property: "og:title", content: "Product Demos — Knowledge Center" },
      {
        property: "og:description",
        content:
          "Watch AI product demos, browse team documentation, and ask the assistant for a status summary or a ready-made deck.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function AskBar() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);

  const buildDeck = async () => {
    if (!question.trim() || !session?.access_token) return;
    setBusy(true);
    try {
      const deckId = await generateDeck(session.access_token, question.trim());
      void navigate({ to: "/deck/$deckId", params: { deckId } });
    } catch (error: any) {
      toast.error(error?.message || "Could not build the deck");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ai-command-surface relative overflow-hidden rounded-2xl border border-primary/15 bg-card p-5 sm:p-7">
      <div className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Bot className="h-6 w-6" /></div>
      <p className="text-xs font-semibold uppercase text-primary">AI knowledge engine</p>
      <h2 className="mt-2 max-w-xl font-display text-xl font-semibold sm:text-2xl">Turn team knowledge into decisions.</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Search project status, surface evidence, and create a leadership-ready presentation in moments.</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void buildDeck();
          }}
          placeholder="e.g. What's the status of Data Intake?"
          className="h-12 flex-1 rounded-xl border-primary/15 bg-background px-4 shadow-sm"
        />
        <Button className="h-12 rounded-xl px-5" onClick={() => void buildDeck()} disabled={busy || !question.trim()}>
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Presentation className="mr-1.5 h-4 w-4" />}
          Generate deck
        </Button>
      </div>
    </div>
  );
}

function HomePage() {
  const { data } = useQuery({ queryKey: ["tree"], queryFn: fetchTree });
  const docs = data?.allDocuments ?? [];
  const recent = [...docs]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6);

  return (
    <KnowledgeShell>
      <div className="presentation-grid min-h-full">
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-8 sm:py-10">
        <header className="reveal flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">AI Team Workspace</p>
            <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Knowledge Center</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Discover product capabilities, understand delivery status, and transform trusted knowledge into action.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className="h-2 w-2 rounded-full bg-success" /> AI assistant ready</div>
        </header>

        <AskBar />

        <DemoGallery />

        <section className="pb-10">
          <div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase text-primary">Knowledge stream</p><h2 className="mt-1 font-display text-xl font-semibold">Recently updated</h2></div></div>
          <div className="mt-4 overflow-hidden rounded-xl border bg-card shadow-soft">
            {recent.map((doc) => (
              <Link
                key={doc.id}
                to="/d/$docId"
                params={{ docId: doc.id }}
                className="group flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-accent/60 sm:px-5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary"><FileText className="h-4 w-4" /></span>
                  <span className="text-sm font-medium">{doc.title}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {statusLabels[doc.status]}
                  </span>
                </div>
                <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                  {formatDistanceToNow(new Date(doc.updated_at))} ago
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
                </span>
              </Link>
            ))}
            {recent.length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground">No documents yet.</div>
            )}
          </div>
        </section>
      </div></div>
    </KnowledgeShell>
  );
}
