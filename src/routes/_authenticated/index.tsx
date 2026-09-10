import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Sparkles, Loader2 } from "lucide-react";
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
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-display text-lg font-medium">
        <Sparkles className="h-4 w-4 text-primary" />
        Ask the assistant
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Ask about project status or search across every page — or turn the answer straight into a deck.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void buildDeck();
          }}
          placeholder="e.g. What's the status of Data Intake?"
          className="flex-1"
        />
        <Button onClick={() => void buildDeck()} disabled={busy || !question.trim()}>
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
          Build a deck
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
      <div className="mx-auto max-w-6xl space-y-10 p-8">
        <header>
          <h1 className="font-display text-2xl font-semibold">AI Team Knowledge Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Product demos, documentation and an assistant that answers with sources.
          </p>
        </header>

        <AskBar />

        <DemoGallery />

        <section>
          <h2 className="font-display text-lg font-medium">Recently updated pages</h2>
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
        </section>
      </div>
    </KnowledgeShell>
  );
}
