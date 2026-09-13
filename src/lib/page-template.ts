export const PAGE_TEMPLATE_SECTIONS = [
  "Overview",
  "Objectives",
  "Status",
  "Resources & Capacity",
  "Key Links",
  "Owners",
  "Next Steps",
] as const;

const PLACEHOLDER = "_Add details here._";

export function defaultPageContent(): string {
  return PAGE_TEMPLATE_SECTIONS.map((s) => `## ${s}\n\n${PLACEHOLDER}\n`).join("\n");
}

function hasSection(content: string, section: string) {
  const normalized = section.toLowerCase();
  return content
    .split("\n")
    .some((line) => /^#{1,6}\s+/.test(line) && line.replace(/^#{1,6}\s+/, "").trim().toLowerCase() === normalized);
}

/** Appends only the template sections that are missing, keeping existing content intact. */
export function mergeTemplate(content: string): string {
  const existing = (content ?? "").trim();
  if (!existing) return defaultPageContent();

  const hasOverview = hasSection(existing, "Overview");
  const missing = PAGE_TEMPLATE_SECTIONS.filter((s) => !hasSection(existing, s));
  if (missing.length === 0) return existing;

  const body = hasOverview ? existing : `## Overview\n\n${existing}`;
  const toAppend = missing.filter((s) => !(s === "Overview" && !hasOverview));

  if (toAppend.length === 0) return body;
  return `${body}\n\n${toAppend.map((s) => `## ${s}\n\n${PLACEHOLDER}\n`).join("\n")}`.trim();
}
