import { supabase } from "@/integrations/supabase/client";

export type Slide = { title: string; bullets: string[]; notes?: string };

export type Deck = {
  id: string;
  title: string;
  source_question: string | null;
  slides: Slide[];
  created_at: string;
};

export async function fetchDeck(id: string): Promise<Deck | null> {
  const { data, error } = await supabase.from("decks").select("*").eq("id", id).single();
  if (error || !data) return null;
  const row = data as { id: string; title: string; source_question: string | null; slides: unknown; created_at: string };
  return {
    id: row.id,
    title: row.title,
    source_question: row.source_question,
    slides: Array.isArray(row.slides) ? (row.slides as Slide[]) : [],
    created_at: row.created_at,
  };
}

export async function generateDeck(
  accessToken: string,
  question: string,
  answer?: string,
): Promise<string> {
  const res = await fetch("/api/deck", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ question, answer }),
  });
  const json = (await res.json()) as { deckId?: string; error?: string };
  if (!res.ok || !json.deckId) throw new Error(json.error || "Could not build the deck");
  return json.deckId;
}

export async function exportPptx(title: string, slides: Slide[]) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  const cover = pptx.addSlide();
  cover.addText(title, { x: 0.6, y: 2.1, w: 8.8, h: 1.2, fontSize: 34, bold: true, color: "132347" });
  cover.addText(new Date().toLocaleDateString(), { x: 0.6, y: 3.3, fontSize: 14, color: "6B7280" });

  for (const slide of slides) {
    const s = pptx.addSlide();
    s.addText(slide.title, { x: 0.6, y: 0.5, w: 8.8, h: 0.8, fontSize: 24, bold: true, color: "132347" });
    s.addText(
      slide.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
      { x: 0.8, y: 1.5, w: 8.4, h: 3.6, fontSize: 16, color: "1F2937", lineSpacingMultiple: 1.3 },
    );
    if (slide.notes) s.addNotes(slide.notes);
  }

  await pptx.writeFile({ fileName: `${title.replace(/[^\w\s-]/g, "")}.pptx` });
}
