"use client";
import { Check, X } from "lucide-react";
import { useState } from "react";
import type { Entity } from "@/lib/api";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { Button } from "@/ui/atoms";
import { ENTITY_ICON } from "./entityIcons";

/** Candidates for one entity, with their scores; choosing one rewrites every field it fed. */
export function Alternatives({ entity, author, onChoose, onClose, busy }: {
  entity: Entity; author: string; busy?: boolean; onClose: () => void;
  onChoose: (candidateId: string, rememberAlias: boolean) => void;
}) {
  const [pick, setPick] = useState(entity.chosen);
  const [remember, setRemember] = useState(false);
  const Icon = ENTITY_ICON[entity.type];
  return (
    <div className="sq sq-md mt-4 bg-[var(--pill-neutral-bg)] p-4" data-testid="alternatives">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-muted" aria-hidden />
        <h3 className="text-body font-medium">{t.detail.alternatives} · {t.entities[entity.type]}</h3>
        <button type="button" onClick={onClose} aria-label={t.common.close} className="ml-auto grid size-7 place-items-center rounded-full text-muted hover:text-text"><X className="size-4" /></button>
      </div>
      <div role="radiogroup" aria-label={t.detail.alternatives} className="space-y-1.5">
        {entity.candidates.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={pick === c.id} onClick={() => setPick(c.id)}
            className={cn("sq sq-sm flex w-full items-center gap-3 bg-surface/60 px-3 py-2.5 text-left ring-1 ring-transparent transition-colors dark:bg-white/5", pick === c.id && "ring-accent")}>
            <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2 border-control", pick === c.id && "border-accent bg-accent text-on-accent")}>
              {pick === c.id && <Check className="size-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{c.label}</span>
              <span className="block truncate text-small text-muted">{c.detail}</span>
            </span>
            <span className="text-small text-muted tabular">{Math.round(c.score * 100)} %</span>
          </button>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-2 text-small text-muted">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[var(--accent)]" />
        {t.detail.rememberAlias(author)}
      </label>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onClose}>{t.detail.cancel}</Button>
        <Button size="sm" variant="primary" busy={busy} onClick={() => onChoose(pick, remember)}>{t.detail.choose}</Button>
      </div>
    </div>
  );
}
