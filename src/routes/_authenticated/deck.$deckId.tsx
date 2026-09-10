import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, FilePlus } from "lucide-react";
import { toast } from "sonner";
import { KnowledgeShell } from "@/components/knowledge/KnowledgeShell";
import { Button } from "@/components/ui/button";
import { fetchDeck, exportPptx } from "@/lib/deck";
import { fetchTree } from "@/lib/knowledge";
import { useAuth, canEdit } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/deck/$deckId")({
  head: () => ({
    meta: [
      { title: "Generated deck — Knowledge Center" },
      { name: "description", content: "A slide deck generated from your team's knowledge base." },
      { property: "og:title", content: "Generated deck — Knowledge Center" },
      { property: "og:description", content: "A slide deck generated from your team's knowledge base." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DeckPage,
});

function DeckPage() {
  const { deckId } = Route.useParams();
  const { role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deckQuery = useQuery({ queryKey: ["deck", deckId], queryFn: () => fetchDeck(deckId) });
  const treeQuery = useQuery({ queryKey: ["tree"], queryFn: fetchTree });
  const [index, setIndex] = useState(0);

  const deck = deckQuery.data;
  const slides = deck?.slides ?? [];
  const slide = slides[index];

  const saveAsPage = async () => {
    const folderId = treeQuery.data?.allFolders?.[0]?.id;
    if (!deck || !folderId) {
      toast.error("Create a section first");
      return;
    }
    const markdown = slides
      .map((s) => `## ${s.title}\n\n${s.bullets.map((b) => `- ${b}`).join("\n")}`)
      .join("\n\n");
    const { data, error } = await supabase
      .from("documents")
      .insert({ folder_id: folderId, title: deck.title, content: markdown, status: "draft" })
      .select("id")
      .single();
    if (error || !data) {
      toast.error("Could not save the page");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["tree"] });
    toast.success("Saved as a page");
    void navigate({ to: "/d/$docId", params: { docId: (data as { id: string }).id } });
  };

  return (
    <KnowledgeShell>
      <div className="mx-auto max-w-4xl p-8">
        {deckQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading deck…</p>
        ) : !deck ? (
          <p className="text-sm text-muted-foreground">This deck is not available.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-semibold">{deck.title}</h1>
                {deck.source_question && (
                  <p className="mt-1 text-sm text-muted-foreground">From: “{deck.source_question}”</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void exportPptx(deck.title, slides)}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  PowerPoint
                </Button>
                {canEdit(role) && (
                  <Button size="sm" variant="outline" onClick={() => void saveAsPage()}>
                    <FilePlus className="mr-1.5 h-3.5 w-3.5" />
                    Save as page
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-6 aspect-video w-full overflow-hidden rounded-xl border bg-card p-10 shadow-sm">
              <h2 className="font-display text-2xl font-semibold">{slide?.title}</h2>
              <ul className="mt-6 space-y-3 text-base">
                {slide?.bullets.map((b, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Slide {index + 1} of {slides.length}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
                disabled={index >= slides.length - 1}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            {slide?.notes && (
              <div className="mt-6 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide">Speaker notes</p>
                {slide.notes}
              </div>
            )}
          </>
        )}
      </div>
    </KnowledgeShell>
  );
}
