import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
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
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.replace("Bearer ", "");
  if (!token || token.split(".").length !== 3) {
    throw new Error("Unauthorized");
  }
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    throw new Error("Unauthorized");
  }
  return { supabase, userId: data.claims.sub };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: { role: string; content: string }[] };
        const messages = body.messages ?? [];
        const lastUserText = messages.filter((m) => m.role === "user").pop()?.content ?? "";

        const { supabase } = await getAuthenticatedSupabase(request);

        const [{ data: docs }, { data: attachments }] = await Promise.all([
          supabase.from("documents").select("id, title, content, status, folder_id, badge"),
          supabase.from("attachments").select("id, document_id, file_name, extracted_text"),
        ]);

        const documents = (docs as any[] | null) ?? [];
        const atts = (attachments as any[] | null) ?? [];

        const scored = documents
          .map((doc) => {
            const text = `${doc.title} ${doc.content}`.toLowerCase();
            const terms = lastUserText.toLowerCase().split(/\s+/).filter(Boolean);
            const matches = terms.filter((t) => text.includes(t)).length;
            return { ...doc, score: matches };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 6);

        const contextText = scored
          .map((doc) => {
            const docAtts = atts.filter((a) => a.document_id === doc.id);
            const attText = docAtts.map((a) => `Attachment: ${a.file_name}\n${a.extracted_text ?? ""}`).join("\n\n");
            return `Document: ${doc.title} (${doc.status})\n${doc.content}\n${attText}`.trim();
          })
          .join("\n\n---\n\n");

        const system =
          "You are a helpful assistant for a team Knowledge Center. Use the provided documents to answer questions. " +
          "When you reference a document, cite it with a markdown link like [Title](/d/<document id>). " +
          "If the answer is not in the documents, say so.\n\n" +
          "Documents:\n\n" +
          contextText;

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) throw new Error("Missing LOVABLE_API_KEY");

        const gateway = createLovableAiGatewayProvider(key);
        const result = await streamText({
          model: gateway("google/gemini-3.7-flash"),
          system,
          messages: messages.map((m) => ({ role: m.role as any, content: m.content })),
        });

        return result.toDataStreamResponse();
      },
    },
  },
});
