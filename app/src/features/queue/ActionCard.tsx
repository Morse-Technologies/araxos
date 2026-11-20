"use client";
import { CalendarClock, Check, CheckCircle2, HelpCircle, Pencil, Sparkles } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import type { Action, ActionField, Note } from "@/lib/api";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { Band, Button, Pill, bandBg } from "@/ui/atoms";
import type { Highlight } from "./Transcript";

function sourceText(note: Note, f: ActionField): string | undefined {
  const s = f.source;
  if (!s) return undefined;
  if (s.inferred) return `${t.detail.inferred}: ${s.inferred}`;
  const range = s.words ?? (s.entityId ? (() => { const e = note.entities.find((x) => x.id === s.entityId); return e ? [e.from, e.to] as [number, number] : undefined; })() : undefined);
  if (!range) return undefined;
  return `«${note.transcript.words.slice(range[0], range[1] + 1).map((w) => w.text).join(" ")}»`;
}

function FieldRow({ note, field, lit, locked, onHover, onSave }: {
  note: Note; field: ActionField; lit: boolean; locked: boolean; onHover: (h: Highlight) => void; onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const src = sourceText(note, field);
  const hover = () => onHover(field.source?.entityId ? { entityId: field.source.entityId } : field.source?.words ? { words: field.source.words } : {});
  const commit = () => { if (draft !== null && draft.trim() && draft !== field.after) onSave(draft.trim()); setDraft(null); };
  const keys = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setDraft(null); };
  return (
    <div className={cn("sq sq-xs -mx-2 grid grid-cols-[96px_minmax(0,1fr)] items-start gap-3 px-2 py-1.5 transition-colors", lit && "bg-accent-soft")}
      onMouseEnter={hover} onMouseLeave={() => onHover({})} data-field={field.key}>
      <dt className="pt-0.5 text-small text-muted">{field.label}</dt>
      <dd className="min-w-0">
        {draft !== null ? (
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={keys} onBlur={commit} aria-label={field.label}
            className="sq sq-xs h-8 w-full bg-surface px-2 ring-2 ring-accent outline-none" />
        ) : (
          <button type="button" disabled={locked} onClick={() => setDraft(field.after)} title={src ?? t.detail.clickToEdit} data-edit
            className={cn("group/f flex w-full items-start gap-1.5 text-left", field.mono && "font-mono text-[13px]")}>
            <span className="min-w-0 break-words">{field.after}</span>
            {field.edited && <Pill tone="accent" className="h-5 px-1.5">{t.detail.edited}</Pill>}
            {!locked && <Pencil aria-hidden className="mt-1 size-3 shrink-0 text-muted opacity-0 transition-opacity group-hover/f:opacity-100 group-focus-visible/f:opacity-100" />}
          </button>
        )}
        {src && <span className="mt-0.5 flex items-center gap-1 text-small text-muted">{field.source?.inferred && <Sparkles className="size-3" aria-hidden />}<span className="truncate">{src}</span></span>}
      </dd>
    </div>
  );
}

/** One proposed action: band, target, editable fields with provenance, and its question or conflict if any. */
export function ActionCard({ note, action, highlight, onHover, onEdit, onAnswer, onFix, busy }: {
  note: Note; action: Action; highlight: Highlight; onHover: (h: Highlight) => void; busy?: boolean;
  onEdit: (key: string, value: string) => void; onAnswer: (optionId: string) => void; onFix: () => void;
}) {
  const locked = note.state === "applied" || note.state === "rejected";
  const lit = (f: ActionField) => (!!highlight.entityId && f.source?.entityId === highlight.entityId);
  const q = action.question;
  const k = action.conflict;
  return (
    <article className="sq sq-md relative overflow-hidden bg-surface/70 p-4 pl-5 shadow-[0_1px_2px_rgb(16_24_40/0.05)] ring-1 ring-[var(--rule)] dark:bg-white/[0.04]" data-action={action.id}>
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", bandBg(action.kind))} />
      <header className="mb-2 flex items-center gap-2">
        <Band kind={action.kind} />
        <h3 className="text-body font-semibold">{action.title}</h3>
        <span className="ml-auto truncate font-mono text-small text-muted">{action.system} · {action.model}</span>
      </header>
      <dl className="space-y-0.5">
        {action.fields.map((f) => <FieldRow key={f.key} note={note} field={f} lit={lit(f)} locked={locked} onHover={onHover} onSave={(v) => onEdit(f.key, v)} />)}
      </dl>
      {q && (
        <div className={cn("sq sq-sm mt-3 p-3", q.answer ? "bg-[var(--pill-neutral-bg)]" : "bg-[var(--pill-warning-bg)] text-[var(--pill-warning-ink)]")} data-testid="question">
          <p className="mb-2 flex items-center gap-1.5 text-body font-medium">{q.answer ? <CheckCircle2 className="size-4" /> : <HelpCircle className="size-4" />}{q.prompt}</p>
          <div className="flex flex-wrap gap-2">
            {q.options.map((o) => (
              <button key={o.id} type="button" disabled={busy || locked} onClick={() => onAnswer(o.id)} aria-pressed={q.answer === o.id}
                className={cn("sq sq-sm bg-surface px-3 py-1.5 text-left text-body text-text ring-1 ring-[var(--rule)] transition-[box-shadow,transform] active:scale-[0.98]", q.answer === o.id && "ring-2 ring-accent")}>
                <span className="flex items-center gap-1.5 font-medium">{q.answer === o.id && <Check className="size-3.5 text-accent" />}{o.label}</span>
                {o.detail && <span className="block text-small text-muted">{o.detail}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      {k && (
        <div className={cn("sq sq-sm mt-3 flex items-center gap-3 p-3", k.resolved ? "bg-[var(--pill-neutral-bg)]" : "bg-[var(--pill-warning-bg)] text-[var(--pill-warning-ink)]")} data-testid="conflict">
          <CalendarClock className="size-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1 text-body">{k.resolved ? `${t.detail.resolved}: ${k.fix?.value}` : k.message}</p>
          {!k.resolved && k.fix && <Button size="sm" variant="primary" busy={busy} onClick={onFix} disabled={locked}>{k.fix.label}</Button>}
        </div>
      )}
    </article>
  );
}
