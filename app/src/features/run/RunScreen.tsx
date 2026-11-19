"use client";
import { ArrowLeft, BookOpen, Camera, Check, Keyboard, Lightbulb, Mic, Ruler } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CloseSheet } from "@/features/cases/CloseSheet";
import { lockForStep, showProblem, useDeviceId, useLookups } from "@/features/cases/shared";
import { useCase, useConfirmStep, useLocks, useMe, useVersion } from "@/features/hooks";
import type { Step, StepRun } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { fmtTime } from "@/lib/format";
import { evidenceKindLabel, stepKindLabel } from "@/lib/labels";
import { Band, Button, Checkbox, Kbd, Pill, buttonStyles } from "@/ui/atoms";
import { EmptyState, ErrorState, LoadingRows, Modal, SafetyTag, stepKindIcon } from "@/ui/cells";
import { CitedManual } from "@/features/manual/CitedManual";
import { EvidenceSheet, type EvidenceTab } from "./EvidenceSheet";
import { SafetyStep } from "./SafetyStep";
import { SaberSheet } from "./SaberSheet";

const SHORTCUTS: [string, string][] = [
  ["J / K", "Next / previous step"], ["Space", "Confirm the current step"], ["E", "Add evidence"], ["M", "Record a measurement"],
  ["D", "Dictate to Saber"], ["N", "Note for engineering"], ["?", "These shortcuts"],
];

/** T3: the procedure on the left, the step in the middle, the cited manual and the evidence on the right. */
export function RunScreen({ id }: { id: string }) {
  const router = useRouter();
  const { data: c, isPending, isError, refetch } = useCase(id);
  const { data: v } = useVersion(c?.versionId ?? null);
  const { data: me } = useMe();
  const locks = useLocks();
  const look = useLookups();
  const deviceId = useDeviceId();
  const confirm = useConfirmStep();
  const [viewKey, setViewKey] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceTab | null>(null);
  const [saber, setSaber] = useState<"type" | "dictate" | null>(null);
  const [help, setHelp] = useState(false);
  const [closing, setClosing] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const mainRef = useRef<HTMLDivElement>(null);

  const current = c?.steps.find((s) => s.state === "current");
  const steps = useMemo(() => v?.steps ?? [], [v]);
  const shown = steps.find((s) => s.key === (viewKey ?? current?.key)) ?? steps.at(-1);
  const run = c?.steps.find((r) => r.key === shown?.key);
  const isCurrent = !!shown && shown.key === current?.key;
  const finished = !!c && !!c.steps.length && !current;

  const doConfirm = (choice?: string) => {
    if (!c || !shown || !isCurrent) return;
    confirm.mutate({ caseId: c.id, stepKey: shown.key, choice }, {
      onSuccess: () => { setViewKey(null); toast.success(`Step ${shown.n} confirmed`); },
      onError: showProblem,
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest("input, textarea, select, [role=dialog]")) return;
      const i = steps.findIndex((s) => s.key === shown?.key);
      const k = e.key.toLowerCase();
      if (k === "j" && steps[i + 1]) setViewKey(steps[i + 1].key);
      else if (k === "k" && steps[i - 1]) setViewKey(steps[i - 1].key);
      else if (k === "e" && isCurrent) setEvidence("photo");
      else if (k === "m" && isCurrent && shown?.range) setEvidence("measurement");
      else if (k === "d") setSaber("dictate");
      else if (k === "n") setSaber("type");
      else if (e.key === "?") setHelp(true);
      else if (e.key === " " && isCurrent && shown && shown.kind !== "safety" && shown.kind !== "decision") { e.preventDefault(); doConfirm(); }
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (isPending) return <LoadingRows rows={8} className="p-8" />;
  if (isError || !c) return <ErrorState what="this case" onRetry={() => refetch()} className="m-8" />;
  if (!c.versionId) return <EmptyState className="m-8" action={<Link href={`/cases?id=${c.id}`} className={buttonStyles({ variant: "outline" })}>Back to the case</Link>}>This case runs without a procedure. Record what you do as evidence and Saber.</EmptyState>;
  if (!v || !shown || !run) return <LoadingRows rows={8} className="p-8" />;
  const m = look.machine(c.machineId);
  const proc = look.procedure(v.procedureId);
  const done = c.steps.filter((s) => s.state === "done").length;
  const pct = Math.round((done / c.steps.length) * 100);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule px-4 py-3 md:px-6">
        <Link href={`/cases?id=${c.id}`} className={buttonStyles({ variant: "ghost", size: "icon" })} aria-label="Back to the case"><ArrowLeft /></Link>
        <div className="min-w-0">
          <p className="truncate text-body font-medium">{m?.code} · {c.symptom}</p>
          <p className="flex items-center gap-2 text-small text-muted"><span className="num">{c.code}</span><Band kind="procedure" size="xs">{proc?.code} v{v.n}</Band></p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden w-40 sm:block" aria-label={`${done} of ${c.steps.length} steps done`}>
            <div className="h-1.5 rounded-full bg-raised"><div className="h-full rounded-full bg-accent transition-[width] duration-[var(--dur-3)]" style={{ width: `${pct}%` }} /></div>
            <p className="mt-1 text-small text-muted num">{done} of {c.steps.length} done</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Keyboard shortcuts" onClick={() => setHelp(true)}><Keyboard /></Button>
          <Button variant="ghost" onClick={() => setSaber("type")}><Lightbulb />Tell engineering</Button>
          <Button variant={finished ? "primary" : "outline"} onClick={() => setClosing(true)}>Close case</Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_340px]">
        <nav aria-label="Procedure steps" className="hidden min-h-0 overflow-y-auto border-r border-rule bg-ground p-3 lg:block">
          <ol className="flex flex-col gap-0.5">
            {steps.map((s) => <StepItem key={s.key} step={s} run={c.steps.find((r) => r.key === s.key)!} active={s.key === shown.key} onClick={() => setViewKey(s.key)} />)}
          </ol>
        </nav>

        <div ref={mainRef} className="min-h-0 overflow-y-auto px-4 py-6 md:px-8">
          <article key={shown.key} className="mx-auto flex max-w-[720px] flex-col gap-5 animate-enter">
            <header className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-small text-muted">Step {shown.n} of {steps.length} · {stepKindLabel[shown.kind]} · about {shown.minutes} min {shown.kind === "safety" && <SafetyTag />}</p>
              <h1 className="text-title font-medium tracking-[-0.01em]">{shown.title}</h1>
              <p className="text-section font-normal">{shown.body}</p>
              {!isCurrent && <p className="text-small text-muted">{run.state === "done" ? `Done by ${run.by}${run.at ? ` at ${fmtTime(run.at)}` : ""}.` : run.state === "skipped" ? "Skipped by the decision." : "Not reached yet."} {current && <button type="button" className="underline" onClick={() => setViewKey(null)}>Go to the current step</button>}</p>}
            </header>

            {shown.kind === "safety" ? (
              <SafetyStep c={c} step={shown} run={run} lock={lockForStep(locks.data, c, shown)} deviceId={deviceId} current={isCurrent} onPhoto={() => setEvidence("photo")} />
            ) : (
              <>
                {!!shown.requirements.length && (
                  <ul className="flex flex-col gap-2">
                    {shown.requirements.map((r) => {
                      const have = run.evidence.some((e) => (r.kind === "measurement" ? e.kind === "measurement" : r.kind === "photo" ? e.kind === "photo" || e.kind === "screen" : true));
                      return (
                        <li key={r.label} className="flex items-center gap-3 rounded-card border border-border px-4 py-3">
                          {r.kind === "measurement" ? <Ruler className="size-4 text-muted" aria-hidden /> : <Camera className="size-4 text-muted" aria-hidden />}
                          <span className="flex-1 text-body">{r.label}</span>
                          {have ? <Pill tone="positive">Added</Pill> : isCurrent && <Button variant="outline" onClick={() => setEvidence(r.kind === "measurement" ? "measurement" : "photo")}>{r.kind === "measurement" ? "Record" : "Add photo"}</Button>}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {shown.range && <p className="text-body text-muted">Expected {shown.range.min}–{shown.range.max} {shown.range.unit}. {shown.range.onOutOfRange}</p>}
                {shown.kind === "checklist" && isCurrent && (
                  <label className="flex items-center gap-3 text-body"><Checkbox checked={!!checked[shown.key]} onCheckedChange={(x) => setChecked((p) => ({ ...p, [shown.key]: x }))} />I checked it</label>
                )}
                {isCurrent && (shown.kind === "decision" ? (
                  <div className="flex flex-wrap gap-3">
                    {shown.branches.map((b) => <Button key={b.label} variant="outline" size="lg" data-main-action onClick={() => doConfirm(b.label)}>{b.label}</Button>)}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="primary" size="lg" data-main-action disabled={confirm.isPending || (shown.kind === "checklist" && !checked[shown.key])} onClick={() => doConfirm()}><Check />Confirm step</Button>
                    <span className="text-small text-muted"><Kbd>Space</Kbd></span>
                  </div>
                ))}
              </>
            )}
            {finished && (
              <div className="rounded-card border border-border p-5">
                <p className="text-section font-medium">All steps done</p>
                <p className="mt-1 text-body text-muted">Close the case with the cause and what fixed it.</p>
                <Button className="mt-3" variant="primary" size="lg" data-main-action onClick={() => setClosing(true)}>Close case</Button>
              </div>
            )}
          </article>
        </div>

        <aside className="flex min-h-0 flex-col gap-5 overflow-y-auto border-t border-rule p-4 lg:border-t-0 lg:border-l" aria-label="Manual and evidence">
          <section className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-body font-medium"><BookOpen className="size-4" aria-hidden />Cited manual</h2>
            {shown.cite ? <CitedManual key={shown.key} cite={shown.cite} />
              : <p className="text-small text-muted">This step cites no manual page.</p>}
          </section>
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-body font-medium">Evidence for step {shown.n}</h2>
              {isCurrent && <Button size="sm" variant="outline" onClick={() => setEvidence("photo")}>Add <Kbd>E</Kbd></Button>}
            </div>
            {run.evidence.length ? (
              <ul className="flex flex-col gap-2">
                {run.evidence.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 rounded-card border border-border px-3 py-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL thumbnail */}
                    {e.thumb && <img src={e.thumb} alt={e.label} className="h-12 w-16 shrink-0 rounded-control object-cover" />}
                    <div className="min-w-0">
                    <p className="text-body">{e.label}{e.value !== null && <span className={cn("num", e.inRange === false && "text-negative")}> · {e.value} {e.unit}{e.inRange === false ? " (out of range)" : ""}</span>}</p>
                    <p className="text-small text-muted">{evidenceKindLabel[e.kind]} · {e.by} · {fmtTime(e.at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-small text-muted">Nothing yet.</p>}
          </section>
          <section className="mt-auto flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSaber("dictate")}><Mic />Dictate <Kbd>D</Kbd></Button>
          </section>
        </aside>
      </div>

      <EvidenceSheet open={!!evidence} onOpenChange={(o) => { if (!o) setEvidence(null); }} caseId={c.id} step={shown} tab={evidence ?? "photo"} onTab={setEvidence} by={me?.short ?? ""} />
      <SaberSheet open={!!saber} onOpenChange={(o) => { if (!o) setSaber(null); }} dictate={saber === "dictate"} caseId={c.id} procedureId={v.procedureId} step={shown} />
      <CloseSheet key={String(closing)} c={c} open={closing} onOpenChange={setClosing} onClosed={() => router.push(`/cases?id=${c.id}`)} />
      <Modal open={help} onOpenChange={setHelp} title="Keyboard">
        <dl className="grid grid-cols-[96px_1fr] gap-x-4 gap-y-2 px-5 pt-3 pb-5 text-body">
          {SHORTCUTS.map(([k, l]) => <div key={k} className="contents"><dt><Kbd>{k}</Kbd></dt><dd className="text-muted">{l}</dd></div>)}
        </dl>
      </Modal>
    </div>
  );
}

function StepItem({ step, run, active, onClick }: { step: Step; run: StepRun; active: boolean; onClick: () => void }) {
  const Icon = stepKindIcon[step.kind];
  return (
    <li>
      <button type="button" onClick={onClick} aria-current={active ? "step" : undefined}
        className={cn("flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-body transition-colors duration-[var(--dur-1)] hover:bg-raised",
          active && "bg-surface shadow-[0_0_0_1px_var(--border)]", run.state === "pending" && "text-muted", run.state === "skipped" && "text-faint line-through")}>
        <span className={cn("grid size-5 flex-none place-items-center rounded-full text-[11px] num",
          run.state === "done" ? "bg-accent text-on-accent" : run.state === "current" ? "bg-primary text-on-primary" : "bg-active text-muted")}>
          {run.state === "done" ? <Check className="size-3" /> : step.n}
        </span>
        <span className="min-w-0 flex-1 truncate">{step.title}</span>
        <Icon className={cn("size-3.5 flex-none", step.kind === "safety" ? "text-[var(--pill-negative-ink)]" : "text-faint")} aria-label={stepKindLabel[step.kind]} />
      </button>
    </li>
  );
}
