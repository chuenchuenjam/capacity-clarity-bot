import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, canEdit } from "@/lib/auth";
import { fetchInitiatives, fetchStatuses, colorClasses, type InitiativeRow } from "@/lib/roadmap";
import { KnowledgeShell } from "@/components/knowledge/KnowledgeShell";
import { RoadmapGantt } from "@/components/roadmap/RoadmapGantt";
import { InitiativeDialog } from "@/components/roadmap/InitiativeDialog";
import { StatusManagerDialog } from "@/components/roadmap/StatusManagerDialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({
    meta: [
      { title: "Data Intake roadmap — Knowledge Center" },
      {
        name: "description",
        content: "Team capabilities and delivery stages for every data intake initiative.",
      },
      { property: "og:title", content: "Data Intake roadmap — Knowledge Center" },
      {
        property: "og:description",
        content: "Team capabilities and delivery stages for every data intake initiative.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <KnowledgeShell>
      <div className="p-10 text-center text-sm text-muted-foreground">Roadmap unavailable.</div>
    </KnowledgeShell>
  ),
  notFoundComponent: () => (
    <KnowledgeShell>
      <div className="p-10 text-center text-sm text-muted-foreground">Roadmap not found.</div>
    </KnowledgeShell>
  ),
  component: RoadmapPage,
});

function RoadmapPage() {
  const { role } = useAuth();
  const editable = canEdit(role);
  const queryClient = useQueryClient();

  const statusesQuery = useQuery({ queryKey: ["roadmap-statuses"], queryFn: fetchStatuses });
  const initiativesQuery = useQuery({ queryKey: ["roadmap-initiatives"], queryFn: fetchInitiatives });

  const statuses = statusesQuery.data ?? [];
  const initiatives = useMemo(() => initiativesQuery.data ?? [], [initiativesQuery.data]);

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InitiativeRow | null>(null);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);

  const visible = statusFilter
    ? initiatives.filter((i) => i.status_id === statusFilter)
    : initiatives;

  const statusMap = new Map(statuses.map((s) => [s.id, s]));

  const remove = async (item: InitiativeRow) => {
    if (!window.confirm(`Remove "${item.title}" from the roadmap?`)) return;
    const { error } = await supabase.from("roadmap_initiatives").delete().eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["roadmap-initiatives"] });
    toast.success("Project removed");
  };

  return (
    <KnowledgeShell>
      <div className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Data Intake</p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight lg:text-3xl">
              Team capabilities & delivery roadmap
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Every intake initiative, what it ingests, who it serves and how far along it is.
            </p>
          </div>
          {editable && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStatusManagerOpen(true)}>
                <Settings2 className="mr-1.5 h-4 w-4" />
                Manage stages
              </Button>
              <Button
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add project
              </Button>
            </div>
          )}
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter(null)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === null ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
            }`}
          >
            All ({initiatives.length})
          </button>
          {statuses.map((status) => {
            const colors = colorClasses(status.color);
            const count = initiatives.filter((i) => i.status_id === status.id).length;
            const active = statusFilter === status.id;
            return (
              <button
                key={status.id}
                type="button"
                onClick={() => setStatusFilter(active ? null : status.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active ? "border-foreground/40 " + colors.soft : "bg-card hover:bg-muted"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                {status.label} ({count})
              </button>
            );
          })}
        </div>

        <section className="mt-6">
          <RoadmapGantt
            initiatives={visible}
            statuses={statuses}
            editable={editable}
            onEdit={(item) => {
              setEditing(item);
              setDialogOpen(true);
            }}
            onDelete={(item) => void remove(item)}
          />
        </section>

        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold">Capability detail</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {visible.map((item) => {
              const status = item.status_id ? statusMap.get(item.status_id) : undefined;
              const colors = colorClasses(status?.color);
              return (
                <article key={item.id} className="rounded-xl border bg-card p-5 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-base font-semibold leading-snug">{item.title}</h3>
                    {status && (
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${colors.soft} ${colors.text}`}
                      >
                        {status.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{item.stream}</p>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Documents + data
                      </dt>
                      <dd className="mt-0.5 leading-relaxed">{item.documents_data || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Region / product
                      </dt>
                      <dd className="mt-0.5 leading-relaxed">{item.region_product || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Ingestion + downstream use
                      </dt>
                      <dd className="mt-0.5 leading-relaxed">{item.downstream_use || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Stage note
                      </dt>
                      <dd className="mt-0.5 leading-relaxed">
                        {item.stage_note || "—"}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {item.start_period.replace("-", " ")} → {item.end_period.replace("-", " ")}
                        </span>
                      </dd>
                    </div>
                  </dl>
                  {editable && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(item);
                          setDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void remove(item)}>
                        Remove
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <InitiativeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initiative={editing}
        statuses={statuses}
        nextPosition={initiatives.length}
      />
      <StatusManagerDialog
        open={statusManagerOpen}
        onOpenChange={setStatusManagerOpen}
        statuses={statuses}
      />
    </KnowledgeShell>
  );
}
