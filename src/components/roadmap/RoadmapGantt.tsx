import { buildTimeline, colorClasses, periodIndex, periodLabel, type InitiativeRow, type StatusRow } from "@/lib/roadmap";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RoadmapGantt({
  initiatives,
  statuses,
  editable,
  onEdit,
  onDelete,
}: {
  initiatives: InitiativeRow[];
  statuses: StatusRow[];
  editable: boolean;
  onEdit: (initiative: InitiativeRow) => void;
  onDelete: (initiative: InitiativeRow) => void;
}) {
  const timeline = buildTimeline(initiatives);
  const statusMap = new Map(statuses.map((s) => [s.id, s]));
  const streams = Array.from(new Set(initiatives.map((i) => i.stream || "Other")));

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="flex border-b bg-muted/40">
            <div className="w-64 shrink-0 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Initiative
            </div>
            <div className="flex flex-1">
              {timeline.map((q) => (
                <div
                  key={q}
                  className="flex-1 border-l px-2 py-3 text-center text-xs font-medium text-muted-foreground"
                >
                  {periodLabel(q)}
                </div>
              ))}
            </div>
            {editable && <div className="w-20 shrink-0" />}
          </div>

          {streams.map((stream) => (
            <div key={stream}>
              <div className="bg-muted/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {stream}
              </div>
              {initiatives
                .filter((i) => (i.stream || "Other") === stream)
                .map((item) => {
                  const status = item.status_id ? statusMap.get(item.status_id) : undefined;
                  const colors = colorClasses(status?.color);
                  const start = periodIndex(item.start_period) ?? timeline[0]!;
                  const end = periodIndex(item.end_period) ?? start;
                  const offset = Math.max(0, start - timeline[0]!);
                  const span = Math.max(1, Math.min(timeline.length - offset, end - start + 1));
                  return (
                    <div key={item.id} className="flex items-center border-t">
                      <div className="w-64 shrink-0 px-4 py-3">
                        <p className="text-sm font-medium leading-snug">{item.title}</p>
                        {status && (
                          <span className={`mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium ${colors.text}`}>
                            <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                            {status.label}
                          </span>
                        )}
                      </div>
                      <div className="relative flex flex-1 py-3">
                        {timeline.map((q) => (
                          <div key={q} className="flex-1 border-l" />
                        ))}
                        <div
                          className="pointer-events-none absolute inset-y-3 flex items-center px-1"
                          style={{
                            left: `${(offset / timeline.length) * 100}%`,
                            width: `${(span / timeline.length) * 100}%`,
                          }}
                        >
                          <div
                            className={`h-7 w-full overflow-hidden rounded-full ${colors.bar} px-3 text-[11px] font-medium leading-7 text-white`}
                            title={item.stage_note}
                          >
                            <span className="block truncate">{item.stage_note || status?.label || ""}</span>
                          </div>
                        </div>
                      </div>
                      {editable && (
                        <div className="flex w-20 shrink-0 items-center justify-end gap-1 pr-3">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(item)} aria-label="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => onDelete(item)} aria-label="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}

          {initiatives.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No projects match this filter yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
