"use client";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Action, Note } from "@/lib/api";
import { cn } from "@/lib/cn";
import { noteNo, time } from "@/lib/format";
import { t } from "@/lib/i18n";
import { Band, Skeleton } from "@/ui/atoms";
import { Glass } from "@/ui/glass";
import { useNote, usePreview } from "@/features/hooks";

function origin(note: Note, a: Action, label: string) {
  const f = a.fields.find((x) => x.label === label);
  const s = f?.source;
  if (!s) return null;
  if (s.inferred) return <span className="flex items-center gap-1 text-muted"><Sparkles className="size-3" />{s.inferred}</span>;
  const e = s.entityId ? note.entities.find((x) => x.id === s.entityId) : undefined;
  const range = s.words ?? (e ? [e.from, e.to] : undefined);
  if (!range) return null;
  return <span className="text-muted" lang={note.transcript.words[range[0]].lang}>«{note.transcript.words.slice(range[0], range[1] + 1).map((w) => w.text).join(" ")}»</span>;
}

function ActionDiff({ note, action }: { note: Note; action: Action }) {
  const { data } = usePreview(action.id);
  return (
    <Glass tone="strong" className="sq sq-lg overflow-hidden" data-testid="diff-action">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <Band kind={action.kind} />
        <h3 className="text-section font-semibold">{action.title}</h3>
        <span className="font-mono text-small text-muted">{action.system} · {action.model}</span>
        <span className={cn("ml-auto flex items-center gap-1 text-small", action.op === "create" ? "text-positive" : "text-muted")}>
          {action.op === "create" ? <><Plus className="size-3.5" />{t.detail.newRecord}</> : data?.record}
        </span>
      </header>
      {!data ? <Skeleton className="m-5 h-24" /> : (
        <table className="w-full text-body">
          <thead>
            <tr className="border-y border-[var(--rule)] text-left text-small text-muted">
              <th className="w-40 px-5 py-2 font-medium">{t.detail.field}</th>
              <th className="px-3 py-2 font-medium">{t.detail.now}</th>
              <th className="px-3 py-2 font-medium">{t.detail.after}</th>
              <th className="px-5 py-2 font-medium">{t.detail.source}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.label} className="border-b border-[var(--rule)] last:border-0">
                <td className="px-5 py-2.5 text-muted">{r.label}</td>
                <td className="px-3 py-2.5">{r.before ? <span className="text-muted line-through">{r.before}</span> : <span className="text-faint">—</span>}</td>
                <td className={cn("px-3 py-2.5", r.changed && "font-medium")}>{r.after}</td>
                <td className="px-5 py-2.5 text-small">{origin(note, action, r.label)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data && <p className="px-5 pt-1 pb-4 text-small text-muted">{t.detail.computed(time(data.computedAt))}</p>}
    </Glass>
  );
}

/** Full diff against the target systems, with the provenance of every value. */
export function DiffView({ id }: { id: string }) {
  const { data: note } = useNote(id);
  if (!note) return <Skeleton className="h-96" />;
  return (
    <div className="space-y-4" data-testid="diff">
      <div className="flex items-center gap-3 px-1">
        <Link href={`/queue/${id}`} className="sq sq-sm flex h-9 items-center gap-2 px-3 text-body font-medium hover:bg-[var(--pill-neutral-bg)]"><ArrowLeft className="size-4" />{t.detail.back}</Link>
        <span className="font-mono text-small text-muted">{noteNo(note.number)}</span>
        <h2 className="text-title font-semibold tracking-tight">{note.customer}</h2>
      </div>
      {note.actions.map((a) => <ActionDiff key={a.id} note={note} action={a} />)}
    </div>
  );
}
