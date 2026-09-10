import { ExternalLink } from "lucide-react";
import { detectProvider, providerLabels, toEmbedUrl } from "@/lib/media";

export function EmbedView({ url, title }: { url: string; title?: string | null }) {
  const provider = detectProvider(url);
  const embed = toEmbedUrl(url);

  if (!embed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between rounded-md border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{title || url}</span>
          <span className="text-xs text-muted-foreground">{providerLabels[provider]}</span>
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
      </a>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5">
        <span className="truncate text-xs font-medium">{title || providerLabels[provider]}</span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Open <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <iframe
        title={title || providerLabels[provider]}
        src={embed}
        className="h-[520px] w-full bg-background"
        allow="fullscreen; clipboard-write; encrypted-media; picture-in-picture"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
      />
    </div>
  );
}
