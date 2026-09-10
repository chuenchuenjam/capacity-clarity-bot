export type EmbedProvider =
  | "miro"
  | "figma"
  | "youtube"
  | "vimeo"
  | "loom"
  | "google"
  | "powerbi"
  | "link";

export const providerLabels: Record<EmbedProvider, string> = {
  miro: "Miro board",
  figma: "Figma",
  youtube: "YouTube",
  vimeo: "Vimeo",
  loom: "Loom",
  google: "Google",
  powerbi: "Power BI",
  link: "Link",
};

export function detectProvider(rawUrl: string): EmbedProvider {
  let host = "";
  try {
    host = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "link";
  }
  if (host.endsWith("miro.com")) return "miro";
  if (host.endsWith("figma.com")) return "figma";
  if (host.endsWith("youtube.com") || host === "youtu.be") return "youtube";
  if (host.endsWith("vimeo.com")) return "vimeo";
  if (host.endsWith("loom.com")) return "loom";
  if (host.endsWith("google.com")) return "google";
  if (host.endsWith("powerbi.com")) return "powerbi";
  return "link";
}

/** Converts a share link into the provider's embeddable URL. Returns null when it can't be embedded. */
export function toEmbedUrl(rawUrl: string): string | null {
  const provider = detectProvider(rawUrl);
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  switch (provider) {
    case "youtube": {
      const id =
        url.hostname.includes("youtu.be")
          ? url.pathname.slice(1)
          : (url.searchParams.get("v") ?? url.pathname.split("/").pop() ?? "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    case "vimeo": {
      const id = url.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    case "loom":
      return rawUrl.replace("/share/", "/embed/");
    case "miro":
      return rawUrl.includes("/live-embed/")
        ? rawUrl
        : rawUrl.replace("/app/board/", "/app/live-embed/");
    case "figma":
      return `https://www.figma.com/embed?embed_host=knowledge-center&url=${encodeURIComponent(rawUrl)}`;
    case "google": {
      if (url.pathname.includes("/edit")) return rawUrl.replace(/\/edit.*$/, "/preview");
      return rawUrl;
    }
    case "powerbi":
      return rawUrl;
    default:
      return null;
  }
}

export type MediaKind = "video" | "audio" | "image" | "pdf" | "sheet" | "text" | "other";

export function mediaKind(fileName: string, mime: string | null): MediaKind {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const m = (mime ?? "").toLowerCase();
  if (m.startsWith("video/") || ["mp4", "webm", "mov", "m4v"].includes(ext)) return "video";
  if (m.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg"].includes(ext)) return "audio";
  if (m.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return "image";
  if (m === "application/pdf" || ext === "pdf") return "pdf";
  if (["xlsx", "xls", "csv"].includes(ext)) return "sheet";
  if (m.startsWith("text/") || ["txt", "md", "json", "log"].includes(ext)) return "text";
  return "other";
}

export function isYoutubeLike(url: string) {
  const p = detectProvider(url);
  return p === "youtube" || p === "vimeo" || p === "loom";
}
