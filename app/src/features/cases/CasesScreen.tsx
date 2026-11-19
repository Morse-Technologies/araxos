"use client";
import { Lock as LockIcon, Play, Plus, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCase, useCases, useLocks, useMe, useReassign, useVersion } from "@/features/hooks";
import type { Case } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { fmtAgo, fmtDate, fmtTime } from "@/lib/format";
import { caseStatusLabel, evidenceKindLabel, lockStateLabel, originLabel, routeLabel } from "@/lib/labels";
import { Avatar, Button, Input, Pill, buttonStyles } from "@/ui/atoms";
import { CaseStatusPill, CitationChip, ConfidenceGlyph, EmptyState, ErrorState, KeyValues, LoadingRows, Menu, Segmented, SeverityGlyph, stepKindIcon } from "@/ui/cells";
import { SplitLayout } from "@/ui/templates/ShellLayout";
import { CloseSheet } from "./CloseSheet";
import { bySeverity, isOpen, showProblem, useLookups } from "./shared";

type View = "open" | "mine" | "blocked" | "closed" | "all";
const VIEWS: { value: View; label: string }[] = [
  { value: "open", label: "Open" }, { value: "mine", label: "Mine" }, { value: "blocked", label: "Blocked" }, { value: "closed", label: "Closed" }, { value: "all", label: "All" },
];

/** D2: the case queue on the left (384 px), the case on the right. */
export function CasesScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const cases = useCases();
  const { data: me } = useMe();
  const look = useLookups();
  const [view, setView] = useState<View>("open");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const text = q.trim().toLowerCase();
    return (cases.data ?? []).filter((c) =>
      (view === "all" || (view === "open" && isOpen(c)) || (view === "mine" && isOpen(c) && c.assigneeId === me?.id) || c.status === view)
      && (!text || `${c.code} ${c.symptom} ${look.machine(c.machineId)?.code}`.toLowerCase().includes(text)),
    ).sort((a, b) => (view === "closed" ? Date.parse(b.closedAt ?? b.openedAt) - Date.parse(a.closedAt ?? a.openedAt) : bySeverity(a, b)));
  }, [cases.data, view, q, me, look]);
  const selected = id ?? rows[0]?.id ?? null;
  const open = (c: Case) => router.replace(`/cases?id=${c.id}`, { scroll: false });

  return (
    <SplitLayout
      list={(
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col gap-3 border-b border-rule p-4">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-section font-medium">Cases</h1>
              <Link href="/cases/new" className={buttonStyles({ variant: "primary", size: "sm" })}><Plus />New incident</Link>
            </div>
            <Segmented label="Show" options={VIEWS} value={view} onChange={setView} />
            <Input aria-label="Search cases" placeholder="Search code, machine or symptom" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {cases.isPending ? <LoadingRows rows={8} pitch="h-16" className="p-4" />
            : cases.isError ? <ErrorState what="cases" onRetry={() => cases.refetch()} className="m-4" />
              : !rows.length ? <EmptyState className="m-4">No cases here.</EmptyState>
                : (
                  <ul role="listbox" aria-label="Cases" className="min-h-0 flex-1 overflow-y-auto">
                    {rows.map((c) => (
                      <li key={c.id} role="option" aria-selected={c.id === selected}>
                        <button type="button" onClick={() => open(c)} className={cn("flex w-full flex-col gap-1 border-b border-rule px-4 py-3 text-left transition-colors duration-[var(--dur-1)] hover:bg-raised", c.id === selected && "bg-surface")}>
                          <span className="flex items-center gap-2 text-small text-muted">
                            <SeverityGlyph severity={c.severity} label={false} />
                            <span className="font-medium text-text">{look.machine(c.machineId)?.code}</span>
                            <span className="num">{c.code}</span>
                            <span className="ml-auto">{fmtAgo(c.openedAt)}</span>
                          </span>
                          <span className="line-clamp-2 text-body">{c.symptom}</span>
                          <span className="flex items-center gap-2 text-small text-muted">
                            {caseStatusLabel[c.status]}{c.status === "blocked" && <LockIcon className="size-3" aria-label="Lock" />}
                            <span className="ml-auto">{look.person(c.assigneeId)?.name ?? "Unassigned"}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
        </div>
      )}
      detail={selected ? <CaseDetail id={selected} /> : <EmptyState className="m-8">Pick a case.</EmptyState>}
    />
  );
}

function CaseDetail({ id }: { id: string }) {
  const { data: c, isPending, isError, refetch } = useCase(id);
  const { data: v } = useVersion(c?.versionId ?? null);
  const locks = useLocks();
  const look = useLookups();
  const reassign = useReassign();
  const [closing, setClosing] = useState(false);
  if (isPending) return <LoadingRows rows={6} className="p-8" />;
  if (isError || !c) return <ErrorState what="this case" onRetry={() => refetch()} className="m-8" />;
  const m = look.machine(c.machineId);
  const proc = v ? look.procedure(v.procedureId) : undefined;
  const caseLocks = locks.data?.filter((l) => l.caseId === c.id) ?? [];
  const evidence = c.steps.flatMap((s) => s.evidence.map((e) => ({ ...e, step: s.key })));
  const assignable = look.users.filter((u) => u.roles.includes("technician") || u.roles.includes("lead"));
  const done = c.steps.filter((s) => s.state === "done").length;

  return (
    <div key={c.id} className="mx-auto flex max-w-[960px] flex-col gap-6 px-4 py-6 md:px-8 animate-enter">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-small text-muted"><span className="num">{c.code}</span> · {m?.code} {m?.name} · {c.area}, line {c.line}</p>
          <h2 className="mt-1 text-title font-medium tracking-[-0.01em]">{c.symptom}</h2>
          <p className="mt-2 flex flex-wrap items-center gap-3"><CaseStatusPill status={c.status} /><SeverityGlyph severity={c.severity} /><span className="text-small text-muted">{originLabel[c.origin]} · opened {fmtAgo(c.openedAt)}</span></p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isOpen(c) && (
            <Menu
              trigger={<Button variant="outline"><UserRound />{look.person(c.assigneeId)?.short ?? "Assign"}</Button>}
              items={assignable.map((u) => ({ label: u.name, icon: <Avatar name={u.name} hue={u.hue} size={20} />, onClick: () => reassign.mutate({ caseId: c.id, userId: u.id }, { onSuccess: () => toast.success(`Assigned to ${u.name}`), onError: showProblem }) }))}
            />
          )}
          {isOpen(c) && <Button variant="outline" onClick={() => setClosing(true)}>Close case</Button>}
          {isOpen(c) && (c.versionId
            ? <Link href={`/cases/${c.id}/run`} className={buttonStyles({ variant: "primary" })}><Play />{done ? "Continue" : "Start"}</Link>
            : <Link href={`/cases/new?case=${c.id}`} className={buttonStyles({ variant: "primary" })}><Sparkles />Get a proposal</Link>)}
        </div>
      </header>

      {c.proposal && (
        <section className="rounded-card border border-border p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="text-section font-medium">{c.proposal.diagnosis ?? "No approved source"}</h3>
            <span className="flex items-center gap-3 text-small text-muted">{routeLabel[c.proposal.route]}{c.proposal.confidence && <ConfidenceGlyph confidence={c.proposal.confidence} />}</span>
          </div>
          {c.proposal.reason && <p className="mt-2 text-body text-muted">{c.proposal.reason}</p>}
          {!!c.proposal.why.length && <div className="mt-3 flex flex-wrap gap-2">{c.proposal.why.map((w) => <CitationChip key={w.ref} cite={w} />)}</div>}
        </section>
      )}

      {v && (
        <section className="flex flex-col gap-3">
          <h3 className="flex items-baseline justify-between text-section font-medium">
            <span>{proc?.code} v{v.n} · {proc?.title}</span>
            <span className="text-small font-normal text-muted num">{done} of {c.steps.length} done</span>
          </h3>
          <ol className="flex flex-col divide-y divide-rule rounded-card border border-border">
            {v.steps.map((s) => {
              const run = c.steps.find((r) => r.key === s.key);
              const Icon = stepKindIcon[s.kind];
              return (
                <li key={s.key} className={cn("flex items-center gap-3 px-4 py-2.5 text-body", run?.state === "skipped" && "text-faint line-through", run?.state === "pending" && "text-muted")}>
                  <span className="w-5 text-small text-muted num">{s.n}</span>
                  <Icon className="size-4 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  {!!run?.evidence.length && <span className="text-small text-muted">{run.evidence.length} evidence</span>}
                  <span className="w-28 text-right text-small text-muted">{run?.state === "done" ? `${run.by} · ${run.at ? fmtTime(run.at) : ""}` : run?.state === "current" ? <Pill tone="accent">Current</Pill> : run?.state === "skipped" ? "Skipped" : ""}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {!!caseLocks.length && (
        <section className="flex flex-col gap-3">
          <h3 className="text-section font-medium">Locks</h3>
          <ul className="flex flex-col gap-2">
            {caseLocks.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-card border border-border px-4 py-3 text-body">
                <LockIcon className="size-4" aria-hidden /><span className="font-medium">{l.id}</span> on {l.point}
                <span className="text-muted">applied by {look.person(l.appliedBy)?.name} · {fmtTime(l.appliedAt)}</span>
                <Pill tone={l.state === "verified" ? "positive" : l.state === "removed" ? "neutral" : "warning"} className="ml-auto">{lockStateLabel[l.state]}</Pill>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!!evidence.length && (
        <section className="flex flex-col gap-3">
          <h3 className="text-section font-medium">Evidence</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {evidence.map((e) => (
              <li key={e.id} className="rounded-card border border-border px-4 py-3">
                <p className="text-body">{e.label}{e.value !== null && <span className="num"> · {e.value} {e.unit}</span>}</p>
                <p className="text-small text-muted">{evidenceKindLabel[e.kind]} · {e.by} · {fmtTime(e.at)} · <code className="font-mono">{e.sha256.slice(0, 8)}</code></p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.close && (
        <section className="flex flex-col gap-3">
          <h3 className="text-section font-medium">Closed {c.closedAt ? fmtDate(c.closedAt) : ""}</h3>
          <KeyValues rows={[
            { k: "Cause", v: c.close.cause }, { k: "Solution", v: c.close.solution }, { k: "Parts", v: c.close.parts.join(", ") || "None" },
            { k: "Time", v: `${c.close.minutes} min` }, { k: "Procedure helped", v: c.close.helped === "yes" ? "Yes" : c.close.helped === "partly" ? "Partly" : "No" },
          ]} />
        </section>
      )}
      <CloseSheet key={`${c.id}-${closing}`} c={c} open={closing} onOpenChange={setClosing} />
    </div>
  );
}
