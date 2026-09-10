import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DemoRow = Database["public"]["Tables"]["demos"]["Row"];
export type EmbedRow = Database["public"]["Tables"]["embeds"]["Row"];

export async function fetchDemos(): Promise<DemoRow[]> {
  const { data, error } = await supabase
    .from("demos")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data as DemoRow[] | null) ?? [];
}

export async function fetchEmbeds(documentId: string): Promise<EmbedRow[]> {
  const { data, error } = await supabase
    .from("embeds")
    .select("*")
    .eq("document_id", documentId)
    .order("position", { ascending: true });
  if (error) return [];
  return (data as EmbedRow[] | null) ?? [];
}

export async function signedUrl(bucket: string, path: string, seconds = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, seconds);
  if (error || !data) return null;
  return data.signedUrl;
}
