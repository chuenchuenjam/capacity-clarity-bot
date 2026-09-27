import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type StatusRow = Database["public"]["Tables"]["roadmap_statuses"]["Row"];
export type InitiativeRow = Database["public"]["Tables"]["roadmap_initiatives"]["Row"];

export const STATUS_COLORS = [
  { key: "emerald", label: "Green (live)", bar: "bg-emerald-500", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", soft: "bg-emerald-500/10" },
  { key: "cyan", label: "Teal (in progress)", bar: "bg-cyan-500", dot: "bg-cyan-500", text: "text-cyan-700 dark:text-cyan-300", soft: "bg-cyan-500/10" },
  { key: "blue", label: "Blue (starting)", bar: "bg-blue-500", dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-300", soft: "bg-blue-500/10" },
  { key: "amber", label: "Amber (at risk)", bar: "bg-amber-500", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", soft: "bg-amber-500/10" },
  { key: "rose", label: "Red (blocked)", bar: "bg-rose-500", dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-300", soft: "bg-rose-500/10" },
  { key: "violet", label: "Purple (exploring)", bar: "bg-violet-500", dot: "bg-violet-500", text: "text-violet-700 dark:text-violet-300", soft: "bg-violet-500/10" },
  { key: "slate", label: "Grey (on hold)", bar: "bg-slate-400", dot: "bg-slate-400", text: "text-slate-600 dark:text-slate-300", soft: "bg-slate-400/10" },
] as const;

export function colorClasses(key: string | null | undefined) {
  return STATUS_COLORS.find((c) => c.key === key) ?? STATUS_COLORS[2];
}

export async function fetchStatuses(): Promise<StatusRow[]> {
  const { data, error } = await supabase
    .from("roadmap_statuses")
    .select("*")
    .order("position", { ascending: true });
  if (error) return [];
  return (data as StatusRow[] | null) ?? [];
}

export async function fetchInitiatives(): Promise<InitiativeRow[]> {
  const { data, error } = await supabase
    .from("roadmap_initiatives")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data as InitiativeRow[] | null) ?? [];
}

/** "2026-Q3" -> 2026*4 + 2 */
export function periodIndex(period: string | null | undefined): number | null {
  if (!period) return null;
  const match = /^(\d{4})-?Q([1-4])$/i.exec(period.trim());
  if (!match) return null;
  return Number(match[1]) * 4 + (Number(match[2]) - 1);
}

export function periodLabel(index: number): string {
  const year = Math.floor(index / 4);
  const quarter = (index % 4) + 1;
  return `Q${quarter} ${year}`;
}

export function buildTimeline(initiatives: InitiativeRow[]): number[] {
  const points: number[] = [];
  for (const item of initiatives) {
    const start = periodIndex(item.start_period);
    const end = periodIndex(item.end_period);
    if (start != null) points.push(start);
    if (end != null) points.push(end);
  }
  if (points.length === 0) {
    const now = new Date();
    const base = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3);
    return [base, base + 1, base + 2, base + 3];
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const timeline: number[] = [];
  for (let i = min; i <= max; i++) timeline.push(i);
  return timeline;
}

export const QUARTER_OPTIONS = (() => {
  const options: string[] = [];
  for (let year = 2025; year <= 2029; year++) {
    for (let q = 1; q <= 4; q++) options.push(`${year}-Q${q}`);
  }
  return options;
})();
