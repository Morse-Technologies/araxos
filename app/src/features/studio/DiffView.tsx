"use client";
import { useDiff } from "@/features/hooks";
import type { DiffRow, Step } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { stepKindLabel } from "@/lib/labels";
import { Pill, type Tone } from "@/ui/atoms";
import { EmptyState, ErrorState, LoadingRows, SafetyTag } from "@/ui/cells";

const CHANGE: Record<DiffRow["change"], { label: string; tone: Tone }> = {
  same: { label: "Same", tone: "neutral" }, added: { label: "Added", tone: "positive" }, removed: { label: "Removed", tone: "negative" }, changed: { label: "Changed", tone: "warning" },
};
const FIELDS: [keyof Step, string][] = [["title", "Title"], ["body", "Text"], ["minutes", "Minutes"], ["kind", "Kind"]];

/** Step-by-step diff between two versions; unchanged steps fold to one line so the change is what you read. */
export function DiffView({ versionId, againstId, againstLabel }: { versionId: string; againstId: string | null; againstLabel: string }) {
  const diff = useDiff(versionId, againstId);
  if (!againstId) return <EmptyState>This is the first version: there is nothing to compare it with.</EmptyState>;
  if (diff.isPending) return <LoadingRows rows={6} />;
  if (diff.isError) return <ErrorState what="the diff" onRetry={() => diff.refetch()} />;
  const changed = diff.data.filter((r) => r.change !== "same").length;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body text-muted">{changed ? `${changed} of ${diff.data.length} steps differ from ${againstLabel}.` : `No step differs from ${againstLabel}.`}</p>
      <ol className="flex flex-col divide-y divide-rule rounded-card border border-border">
        {diff.data.map((r) => {
          const s = r.after ?? r.before!;
          return (
            <li key={r.key} className={cn("flex flex-col gap-2 px-4 py-3", r.change === "same" && "text-muted")}>
              <p className="flex flex-wrap items-center gap-2 text-body">
                <span className="w-6 text-small num">{s.n}</span>
                <span className={cn("font-medium", r.change === "removed" && "line-through")}>{s.title}</span>
                {s.kind === "safety" && <SafetyTag />}
                <span className="text-small text-muted">{stepKindLabel[s.kind]}</span>
                <Pill tone={CHANGE[r.change].tone} className="ml-auto">{CHANGE[r.change].label}</Pill>
              </p>
              {r.change === "changed" && r.before && r.after && (
                <dl className="ml-8 grid gap-2 text-body">
                  {FIELDS.filter(([k]) => JSON.stringify(r.before![k]) !== JSON.stringify(r.after![k])).map(([k, label]) => (
                    <div key={k} className="grid gap-1 sm:grid-cols-[80px_1fr]">
                      <dt className="text-small text-muted">{label}</dt>
                      <dd className="flex flex-col gap-1">
                        <span className="rounded-control bg-[var(--pill-negative-bg)] px-2 py-1 text-[var(--pill-negative-ink)] line-through decoration-1">{String(r.before![k])}</span>
                        <span className="rounded-control bg-[var(--pill-positive-bg)] px-2 py-1 text-[var(--pill-positive-ink)]">{String(r.after![k])}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {r.change === "added" && <p className="ml-8 text-body">{s.body}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
