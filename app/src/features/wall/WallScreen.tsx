"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useCases, useLocks, useMachines, useOverview } from "@/features/hooks";
import { useApplyDensity } from "@/features/session";
import type { Case, CaseStatus, Lock } from "@/lib/api/types";
import { MOCK_NOW } from "@/lib/clock";
import { fmtDate, fmtNum, fmtTime } from "@/lib/format";
import { caseStatusLabel, lockStateLabel } from "@/lib/labels";
import { reduced } from "@/lib/motion";
import { CountUp, Mark } from "@/ui/atoms";
import { CaseStatusPill, EmptyState, ErrorState, LoadingRows, SeverityGlyph } from "@/ui/cells";

const ROTATE_MS = 12_000;
const REPEAT_TOP = 3;
const OPEN_STATUSES: CaseStatus[] = ["open", "in_progress", "blocked"];
type Panel = "cases" | "locks";

export function WallScreen() {
  useApplyDensity("wall");
  const overview = useOverview();
  const cases = useCases();
  const locks = useLocks();
  const machines = useMachines();
  const [panel, setPanel] = useState<Panel>("cases");
  const quiet = reduced();

  useEffect(() => {
    if (reduced()) return;
    const id = window.setInterval(() => setPanel((p) => (p === "cases" ? "locks" : "cases")), ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  const openCases = useMemo(
    () => (cases.data ?? []).filter((c) => c.status !== "closed"),
    [cases.data],
  );
  const locksOn = useMemo(
    () => (locks.data ?? []).filter((l) => l.state !== "removed"),
    [locks.data],
  );
  const codeOf = (id: string) => machines.data?.find((m) => m.id === id)?.code ?? "—";
  const clock = new Date(MOCK_NOW).toISOString();
  const loading = overview.isPending || cases.isPending || locks.isPending;
  const errored = overview.isError || cases.isError || locks.isError;

  if (loading) {
    return (
      <WallFrame clock={clock}>
        <LoadingRows rows={6} pitch="h-16" className="max-w-4xl" />
      </WallFrame>
    );
  }
  if (errored || !overview.data) {
    return (
      <WallFrame clock={clock}>
        <ErrorState
          what="the room display"
          onRetry={() => { overview.refetch(); cases.refetch(); locks.refetch(); }}
        />
      </WallFrame>
    );
  }
  const o = overview.data;

  return (
    <WallFrame clock={clock}>
      <div className="grid flex-1 gap-6 lg:grid-cols-3">
        <Kpi label="Open cases" value={OPEN_STATUSES.reduce((n, s) => n + o.byStatus[s], 0)} accent>
          <ul className="mt-4 flex flex-col gap-2">
            {OPEN_STATUSES.map((s) => (
              <li key={s} className="flex items-center justify-between gap-4 text-section">
                <CaseStatusPill status={s} />
                <span className="num font-medium">{fmtNum(o.byStatus[s])}</span>
              </li>
            ))}
          </ul>
        </Kpi>
        <Kpi label="Blocked" value={o.blocked} />
        <Kpi label="Locks on" value={o.openLocks} />
        <Kpi label="MTTR now" value={o.mttrNow} unit="min" />
        <Kpi label="Repeats · top 3" value={o.repeats[0]?.count ?? 0} className="lg:col-span-2">
          {!o.repeats.length ? <p className="mt-4 text-muted">No repeats.</p> : (
            <ol className="mt-4 flex flex-col gap-2">
              {o.repeats.slice(0, REPEAT_TOP).map((r, i) => (
                <li key={r.machine} className="flex items-baseline justify-between gap-4 text-section">
                  <span><span className="text-muted num">{i + 1}.</span> <span className="num font-medium">{r.machine}</span></span>
                  <span className="num">{fmtNum(r.count)}×</span>
                </li>
              ))}
            </ol>
          )}
        </Kpi>
      </div>
      <section className="mt-8 min-h-[280px] flex-1 rounded-card border border-border bg-surface px-6 py-5">
        {quiet ? (
          <div className="grid gap-8 lg:grid-cols-2">
            <OpenCasesPanel rows={openCases} codeOf={codeOf} />
            <LocksPanel rows={locksOn} />
          </div>
        ) : panel === "cases" ? (
          <OpenCasesPanel rows={openCases} codeOf={codeOf} />
        ) : (
          <LocksPanel rows={locksOn} />
        )}
      </section>
    </WallFrame>
  );
}

function WallFrame({ clock, children }: { clock: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-ground px-8 py-6 text-text md:px-12 md:py-8">
      <header className="mb-8 flex items-start justify-between gap-6">
        <Mark className="size-10" />
        <p className="text-section text-muted num">{fmtDate(clock)} · {fmtTime(clock)}</p>
      </header>
      <main id="main" className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

function Kpi({ label, value, unit, accent, className = "", children }: {
  label: string; value: string | number; unit?: string; accent?: boolean; className?: string; children?: ReactNode;
}) {
  return (
    <div className={`rounded-card border border-border bg-surface px-6 py-5 ${className}`}>
      <p className="text-section text-muted">{label}</p>
      <p className={`mt-2 text-kpi font-medium tracking-[-0.02em] num ${accent ? "text-accent" : ""}`}>
        <CountUp value={value} />
        {unit && <span className="ml-2 text-section text-muted">{unit}</span>}
      </p>
      {children}
    </div>
  );
}

function OpenCasesPanel({ rows, codeOf }: { rows: Case[]; codeOf: (id: string) => string }) {
  return (
    <div>
      <h2 className="text-title font-medium">Open cases</h2>
      {!rows.length ? <EmptyState className="mt-4">No open cases.</EmptyState> : (
        <ul className="mt-4 flex flex-col divide-y divide-rule">
          {rows.map((c) => (
            <li key={c.id} className="flex items-center gap-4 py-3 text-section">
              <SeverityGlyph severity={c.severity} />
              <span className="w-28 font-medium num">{codeOf(c.machineId)}</span>
              <span className="min-w-0 flex-1 truncate">{c.symptom}</span>
              <span className="text-muted">{caseStatusLabel[c.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LocksPanel({ rows }: { rows: Lock[] }) {
  return (
    <div>
      <h2 className="text-title font-medium">Locks on</h2>
      {!rows.length ? <EmptyState className="mt-4">No locks on.</EmptyState> : (
        <ul className="mt-4 flex flex-col divide-y divide-rule">
          {rows.map((l) => (
            <li key={l.id} className="flex items-center gap-4 py-3 text-section">
              <span className="w-36 font-medium num">{l.id}</span>
              <span className="min-w-0 flex-1 truncate">{l.point}</span>
              <span className="text-muted">{lockStateLabel[l.state]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
