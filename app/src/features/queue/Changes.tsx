"use client";
import { ArrowRight, Plus } from "lucide-react";
import type { Action } from "@/lib/api";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { Band, Skeleton } from "@/ui/atoms";
import { usePreview } from "@/features/hooks";

/** What the target system will look like after approval: current value struck through, new value in ink. */
export function ChangeCard({ action }: { action: Action }) {
  const { data } = usePreview(action.id);
  return (
    <section className="sq sq-md bg-surface/70 p-4 ring-1 ring-[var(--rule)] dark:bg-white/[0.04]" data-change={action.id}>
      <header className="mb-2 flex items-center gap-2">
        <Band kind={action.kind} />
        <span className="truncate text-body font-medium">{action.system}</span>
        <span className={cn("ml-auto flex items-center gap-1 text-small", action.op === "create" ? "text-positive" : "text-muted")}>
          {action.op === "create" ? <><Plus className="size-3.5" />{t.detail.newRecord}</> : <span className="font-mono">{action.model}</span>}
        </span>
      </header>
      {!data ? <Skeleton className="h-16" /> : (
        <ul className="space-y-1">
          {data.rows.map((r) => (
            <li key={r.label} className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 text-body">
              <span className="text-small text-muted">{r.label}</span>
              <span className="min-w-0">
                {r.before && <><span className="text-muted line-through decoration-1">{r.before}</span><ArrowRight className="mx-1 inline size-3 text-muted" aria-hidden /></>}
                <span className={cn(r.changed && "font-medium")}>{r.after}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
