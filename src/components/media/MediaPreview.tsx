import { useEffect, useState } from "react";
import { mediaKind } from "@/lib/media";

type SheetData = { name: string; rows: string[][] };

export function MediaPreview({
  fileName,
  mimeType,
  url,
}: {
  fileName: string;
  mimeType: string | null;
  url: string | null;
}) {
  const kind = mediaKind(fileName, mimeType);
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!url) return;
    if (kind === "sheet") {
      void (async () => {
        try {
          const XLSX = await import("xlsx");
          const buf = await (await fetch(url)).arrayBuffer();
          const wb = XLSX.read(buf, { type: "array" });
          const name = wb.SheetNames[0];
          if (!name) return;
          const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name]!, {
            header: 1,
            blankrows: false,
            defval: "",
          });
          if (active) setSheet({ name, rows: rows.slice(0, 200).map((r) => r.map(String)) });
        } catch {
          if (active) setFailed(true);
        }
      })();
    }
    if (kind === "text") {
      void (async () => {
        try {
          const t = await (await fetch(url)).text();
          if (active) setText(t.slice(0, 20000));
        } catch {
          if (active) setFailed(true);
        }
      })();
    }
    return () => {
      active = false;
    };
  }, [url, kind]);

  if (!url) {
    return <div className="p-4 text-xs text-muted-foreground">Loading preview…</div>;
  }

  if (kind === "video") {
    return <video src={url} controls className="w-full rounded-md bg-black" preload="metadata" />;
  }
  if (kind === "audio") {
    return <audio src={url} controls className="w-full" />;
  }
  if (kind === "image") {
    return <img src={url} alt={fileName} className="max-h-[560px] w-full rounded-md object-contain" />;
  }
  if (kind === "pdf") {
    return (
      <iframe title={fileName} src={url} className="h-[640px] w-full rounded-md border bg-white" />
    );
  }
  if (kind === "sheet") {
    if (failed) return <div className="p-4 text-xs text-muted-foreground">Preview unavailable.</div>;
    if (!sheet) return <div className="p-4 text-xs text-muted-foreground">Reading spreadsheet…</div>;
    const [header, ...body] = sheet.rows;
    return (
      <div className="max-h-[520px] overflow-auto rounded-md border">
        <table className="w-full text-xs">
          {header && (
            <thead className="sticky top-0 bg-muted">
              <tr>
                {header.map((c, i) => (
                  <th key={i} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {body.map((row, i) => (
              <tr key={i} className="border-t">
                {row.map((c, j) => (
                  <td key={j} className="whitespace-nowrap px-3 py-1.5">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (kind === "text") {
    if (failed) return <div className="p-4 text-xs text-muted-foreground">Preview unavailable.</div>;
    return (
      <pre className="max-h-[480px] overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
        {text ?? "Loading…"}
      </pre>
    );
  }
  return (
    <div className="rounded-md border p-4 text-xs text-muted-foreground">
      No inline preview for this file type — use the download button.
    </div>
  );
}
