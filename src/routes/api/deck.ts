import { createFileRoute } from "@tanstack/react-router";
import { generateObject } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

async function getAuthenticatedSupabase(request: Request) {
  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase environment variables");
  }
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";
  if (!token || token.split(".").length !== 3) throw new Error("Unauthorized");

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("Unauthorized");
  return { supabase, userId: data.claims.sub as string };
}

const deckSchema = z.object({
  title: z.string(),
  slides: z
    .array(
      z.object({
        title: z.string(),
        bullets: z.array(z.string()),
        notes: z.string(),
      }),
    )
    .min(3)
    .max(10),
});

export const Route = createFileRoute("/api/deck")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { question?: string; answer?: string };
          const question = (body.question ?? "").trim();
          if (!question) return Response.json({ error: "Missing question" }, { status: 400 });

          const { supabase, userId } = await getAuthenticatedSupabase(request);

          const { data: docs } = await supabase
            .from("documents")
            .select("id, title, content, status");
          const documents = (docs as { id: string; title: string; content: string; status: string }[] | null) ?? [];

          const terms = question.toLowerCase().split(/\s+/).filter(Boolean);
          const context = documents
            .map((doc) => {
              const text = `${doc.title} ${doc.content}`.toLowerCase();
              return { doc, score: terms.filter((t) => text.includes(t)).length };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(({ doc }) => `Document: ${doc.title} (${doc.status})\n${doc.content}`)
            .join("\n\n---\n\n");

          const key = process.env["LOVABLE_API_KEY"];
          if (!key) return Response.json({ error: "Missing LOVABLE_API_KEY" }, { status: 500 });

          const gateway = createLovableAiGatewayProvider(key);
          const { object } = await generateObject({
            model: gateway("google/gemini-3.8-flash"),
            schema: deckSchema,
            system:
              "You build concise executive slide decks from a team's internal knowledge base. " +
              "Use ONLY the supplied documents; never invent figures, names, or dates. " +
              "Each slide gets a short title, 3-5 tight bullets (max 14 words each), and speaker notes.",
            prompt:
              `Question from a leader: ${question}\n\n` +
              (body.answer ? `Existing answer to build on:\n${body.answer}\n\n` : "") +
              `Knowledge base extracts:\n\n${context || "(no matching documents)"}`,
          });

          const { data: inserted, error } = await supabase
            .from("decks")
            .insert({
              user_id: userId,
              title: object.title,
              source_question: question,
              slides: object.slides,
            })
            .select("id")
            .single();
          if (error) throw error;

          return Response.json({ deckId: (inserted as { id: string }).id });
        } catch (error: any) {
          const message = error?.message ?? "Deck generation failed";
          const status = message === "Unauthorized" ? 401 : 500;
          console.error("deck generation failed", message);
          return Response.json({ error: message }, { status });
        }
      },
    },
  },
});
