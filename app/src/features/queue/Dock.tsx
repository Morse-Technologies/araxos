"use client";
import { Check, CheckCircle2, PenLine, Undo2, X } from "lucide-react";
import { useEffect, useRef, type PointerEvent } from "react";
import type { Note } from "@/lib/api";
import { openConflicts, openQuestions } from "@/lib/api";
import { writesSummary } from "@/lib/format";
import { t } from "@/lib/i18n";
import { Button, Kbd, Pill } from "@/ui/atoms";
import { Glass } from "@/ui/glass";

/** The floating approval bar: what approving will write, why it can't yet, and the two decisions. */
export function Dock({ note, total, busy, secondName, firstSigner, onApprove, onReject, onUndo, onSignAs }: {
  note: Note; total: number; busy: boolean; secondName?: string; firstSigner?: string;
  onApprove: () => void; onReject: () => void; onUndo: () => void; onSignAs: () => void;
}) {
  const sheen = useRef<HTMLDivElement>(null);
  const q = openQuestions(note);
  const k = openConflicts(note);
  const done = note.state === "applied" || note.state === "rejected";
  const blocked = q ? t.approve.blockedQuestion : k ? t.approve.blockedConflict : null;
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    sheen.current?.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
  };
  useEffect(() => { sheen.current?.style.setProperty("--mx", "30%"); }, []);
  const systems = [...new Set(note.actions.map((a) => a.system))].join(", ");
  return (
    <div className="pointer-events-none sticky bottom-6 z-20 mt-6 flex justify-center">
      <Glass float refract={{ radius: 26, bezel: 18, scale: -48, blur: 14 }} clip={26} onPointerMove={move} data-testid="dock"
        className="sq sq-lg pointer-events-auto flex w-[min(880px,100%)] items-center gap-4 py-3 pr-3 pl-5">
        <div ref={sheen} aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-60 [background:radial-gradient(120px_60px_at_var(--mx)_0%,rgb(255_255_255/0.5),transparent)] dark:opacity-20" />
        <div className="relative min-w-0 flex-1">
          {note.state === "applied" && <p className="flex items-center gap-2 font-medium text-positive"><CheckCircle2 className="size-4" />{t.approve.appliedIn(systems)}</p>}
          {note.state === "rejected" && <p className="font-medium text-negative">{t.states.rejected}{note.rejectedReason ? ` · ${note.rejectedReason}` : ""}</p>}
          {note.state === "awaiting_second" && <p className="flex items-center gap-2 font-medium"><PenLine className="size-4" />{t.approve.secondSignature(firstSigner ?? "")}</p>}
          {!done && note.state !== "awaiting_second" && (
            <p className={blocked ? "font-medium text-[var(--pill-warning-ink)]" : "font-medium"} data-testid="dock-summary">
              {blocked ?? t.approve.willCreate(writesSummary(note.actions))}
            </p>
          )}
          {!done && total > 3000 && note.state !== "awaiting_second" && <Pill className="mt-1"><PenLine />{t.queue.double}</Pill>}
        </div>
        <div className="relative flex items-center gap-2">
          {done ? (
            <Button variant="glass" onClick={onUndo} busy={busy}><Undo2 />{t.approve.undo}</Button>
          ) : (
            <>
              <Button variant="danger" onClick={onReject} disabled={busy}><X />{t.approve.reject}<Kbd>R</Kbd></Button>
              {note.state === "awaiting_second" ? (
                <Button variant="primary" size="lg" onClick={onSignAs} busy={busy}><PenLine />{t.approve.signAs(secondName ?? "")}</Button>
              ) : (
                <Button variant="primary" size="lg" onClick={onApprove} busy={busy} disabled={!!blocked} data-testid="approve">
                  <Check />{t.approve.approve}<span className="ml-1 rounded-md bg-white/15 px-1.5 text-small dark:bg-black/15">A</span>
                </Button>
              )}
            </>
          )}
        </div>
      </Glass>
    </div>
  );
}
