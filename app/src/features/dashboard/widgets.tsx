"use client";
// Every dashboard block is a widget: one definition, one body that adapts to small / medium / big (D1, §24.14).
import Link from "next/link";
import { useMemo, useRef, type ReactNode } from "react";
import { useCases, useKnowledge, useLocks, useMachines, useOverview, useProcedures } from "@/features/hooks";
import type { CaseStatus } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { fmtAgo, fmtNum } from "@/lib/format";
import { useGrow } from "@/lib/gsapIn";
import { caseStatusLabel, knowledgeKindLabel } from "@/lib/labels";
import { CountUp, Skeleton } from "@/ui/atoms";
import { CaseStatusPill, SeverityGlyph } from "@/ui/cells";
import { TrendChart } from "@/ui/organisms/TrendChart";
import type { WidgetSize } from "@/ui/organisms/Widgets";

export type WidgetDef = {
  type: string; title: string; description: string; sizes: WidgetSize[]; defaultSize: WidgetSize;
  aside?: ReactNode; Body: (p: { size: WidgetSize }) => ReactNode;
};

const ViewAll = ({ href, children = "View all" }: { href: string; children?: ReactNode }) => (
  <Link href={href} className="text-text underline-offset-4 hover:underline">{children}</Link>
);
const Figure = ({ value, note }: { value: ReactNode; note?: ReactNode }) => (
  <div>
    <p className="text-kpi font-medium tracking-[-0.01em] num"><CountUp value={value} /></p>
    {note && <p className="mt-0.5 truncate text-small text-muted">{note}</p>}
  </div>
);
const Loading = ({ size }: { size: WidgetSize }) =>
  size === "small" ? <Skeleton className="h-9 w-20" /> : <div className="flex flex-col gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}</div>;
const rowsFor = (size: WidgetSize) => (size === "big" ? 7 : size === "medium" ? 4 : 1);
const MS_PER_S = 1000;
const STATUS_ORDER: CaseStatus[] = ["open", "in_progress", "blocked", "closed"];

/* Small figures ------------------------------------------------------------------------------- */
function OpenByStatus({ size }: { size: WidgetSize }) {
  const { data: o } = useOverview();
  if (!o) return <Loading size={size} />;
  const open = o.byStatus.open + o.byStatus.in_progress + o.byStatus.blocked;
  if (size === "small") return <Figure value={fmtNum(open)} note={`${o.byStatus.in_progress} in progress`} />;
  return (
    <ul className="flex flex-col divide-y divide-rule">
      {STATUS_ORDER.map((s) => <li key={s} className="flex h-10 items-center justify-between text-body"><CaseStatusPill status={s} /><span className="text-section font-medium num">{o.byStatus[s]}</span></li>)}
    </ul>
  );
}
function Blocked() {
  const { data: o } = useOverview();
  return o ? <Figure value={fmtNum(o.blocked)} note="Waiting on a lock or parts" /> : <Loading size="small" />;
}
function KnowledgeQueue() {
  const { data: o } = useOverview();
  return o ? <Figure value={fmtNum(o.knowledgeQueue)} note="Saber items to review" /> : <Loading size="small" />;
}
function PendingApprovals() {
  const { data: o } = useOverview();
  return o ? <Figure value={fmtNum(o.pendingApprovals)} note="Versions waiting for signatures" /> : <Loading size="small" />;
}
function OpenLocks() {
  const { data: o } = useOverview();
  return o ? <Figure value={fmtNum(o.openLocks)} note="Locks on, not yet removed" /> : <Loading size="small" />;
}

/* MTTR with its interval ---------------------------------------------------------------------- */
function Mttr({ size }: { size: WidgetSize }) {
  const { data: o } = useOverview();
  const trend = useMemo(() => o && ({
    t: o.mttr.map((p) => Date.parse(p.day) / MS_PER_S), v: o.mttr.map((p) => p.minutes), lo: o.mttr.map((p) => p.lo), hi: o.mttr.map((p) => p.hi),
  }), [o]);
  if (!o || !trend) return <Loading size={size} />;
  return (
    <div className="flex h-full flex-col gap-2">
      <p className="text-body text-muted"><span className="text-section font-medium text-text num">{o.mttrNow} min</span> yesterday · band is the 25–75 % range</p>
      <TrendChart trend={trend} unit="minutes" label="Mean time to repair" height={size === "big" ? 300 : 150} />
    </div>
  );
}

/* Bars: repeats and coverage ------------------------------------------------------------------- */
function Bars({ rows, size, unit }: { rows: { label: string; value: number; of?: number }[]; size: WidgetSize; unit: string }) {
  const list = useRef<HTMLUListElement>(null);
  useGrow(list, { selector: "[data-barx]", axis: "x" });
  const max = Math.max(...rows.map((r) => r.of ?? r.value), 1);
  return (
    <ul ref={list} className="flex flex-col gap-3">
      {rows.slice(0, rowsFor(size) + 1).map((r, i) => (
        <li key={r.label} className="grid grid-cols-[120px_1fr_56px] items-center gap-3 text-body">
          <span className="truncate text-muted">{r.label}</span>
          <span className="h-2.5 rounded-full bg-raised">
            <span data-barx className={cn("block h-full rounded-full", i === 0 ? "bg-accent" : "bg-bar")} style={{ width: `${Math.max(4, ((r.of ? r.value / r.of : r.value / max)) * 100)}%` }} />
          </span>
          <span className="text-right num">{r.of ? `${r.value}/${r.of}` : `${r.value} ${unit}`}</span>
        </li>
      ))}
    </ul>
  );
}
function Repeats({ size }: { size: WidgetSize }) {
  const { data: o } = useOverview();
  return o ? <Bars size={size} unit="×" rows={o.repeats.map((r) => ({ label: r.machine, value: r.count }))} /> : <Loading size={size} />;
}
function Coverage({ size }: { size: WidgetSize }) {
  const { data: o } = useOverview();
  if (!o) return <Loading size={size} />;
  const rows = [...o.coverage].sort((a, b) => a.covered / a.total - b.covered / b.total).map((c) => ({ label: c.kind, value: c.covered, of: c.total }));
  return <Bars size={size} unit="" rows={rows} />;
}

/* Lists ------------------------------------------------------------------------------------------ */
function UrgentCases({ size }: { size: WidgetSize }) {
  const { data: cases } = useCases();
  const { data: machines } = useMachines();
  if (!cases) return <Loading size={size} />;
  const open = cases.filter((c) => c.status !== "closed").slice(0, rowsFor(size));
  return (
    <ul className="flex flex-col divide-y divide-rule">
      {open.map((c) => (
        <li key={c.id}>
          <Link href={`/cases?id=${c.id}`} className="flex h-10 items-center gap-3 text-body hover:text-muted">
            <SeverityGlyph severity={c.severity} label={false} />
            <span className="w-16 font-medium">{machines?.find((m) => m.id === c.machineId)?.code}</span>
            <span className="min-w-0 flex-1 truncate text-muted">{c.symptom}</span>
            <span className="text-small text-muted">{caseStatusLabel[c.status]}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
function SaberList({ size }: { size: WidgetSize }) {
  const { data: items } = useKnowledge();
  if (!items) return <Loading size={size} />;
  return (
    <ul className="flex flex-col divide-y divide-rule">
      {items.filter((k) => k.status === "captured" || k.status === "in_review").slice(0, rowsFor(size)).map((k) => (
        <li key={k.id} className="py-2 text-body"><span className="text-muted">{knowledgeKindLabel[k.kind]} · {k.author} · {fmtAgo(k.at)}</span><p className="truncate">{k.text}</p></li>
      ))}
    </ul>
  );
}
function LockList({ size }: { size: WidgetSize }) {
  const { data: locks } = useLocks();
  const { data: procs } = useProcedures();
  if (!locks || !procs) return <Loading size={size} />;
  const on = locks.filter((l) => l.state !== "removed");
  return (
    <div className="flex h-full flex-col gap-3">
      <Figure value={fmtNum(on.length)} note="Locks on in the plant" />
      {size !== "small" && on.map((l) => <p key={l.id} className="text-body"><span className="font-medium">{l.id}</span> on {l.point} <span className="text-muted">· {l.state === "applied" ? "waiting for verification" : "verified"}</span></p>)}
    </div>
  );
}

export const WIDGETS: WidgetDef[] = [
  { type: "open-cases", title: "Open cases", description: "Cases by state.", sizes: ["small", "medium"], defaultSize: "small", aside: <ViewAll href="/cases" />, Body: OpenByStatus },
  { type: "blocked", title: "Blocked cases", description: "Cases waiting on a verification or on parts.", sizes: ["small"], defaultSize: "small", Body: Blocked },
  { type: "saber", title: "Saber queue", description: "Captured know-how waiting for engineering.", sizes: ["small"], defaultSize: "small", Body: KnowledgeQueue },
  { type: "approvals", title: "Pending approvals", description: "Procedure versions waiting for signatures.", sizes: ["small"], defaultSize: "small", Body: PendingApprovals },
  { type: "mttr", title: "MTTR, last 30 days", description: "Mean time to repair, with its interval.", sizes: ["medium", "big"], defaultSize: "big", Body: Mttr },
  { type: "repeats", title: "Repeat failures by machine", description: "Machines with more than one case in 30 days.", sizes: ["medium", "big"], defaultSize: "medium", Body: Repeats },
  { type: "coverage", title: "Procedure coverage by machine type", description: "Machines of each type with at least one approved procedure.", sizes: ["medium", "big"], defaultSize: "medium", aside: <ViewAll href="/studio" />, Body: Coverage },
  { type: "urgent", title: "Open cases by urgency", description: "The open cases, most urgent first.", sizes: ["medium", "big"], defaultSize: "medium", aside: <ViewAll href="/cases" />, Body: UrgentCases },
  { type: "saber-list", title: "Latest Saber", description: "What technicians captured most recently.", sizes: ["medium", "big"], defaultSize: "medium", aside: <ViewAll href="/knowledge" />, Body: SaberList },
  { type: "locks", title: "Locks on", description: "Locks on in the plant and their verification.", sizes: ["small", "medium"], defaultSize: "small", aside: <ViewAll href="/safety" />, Body: LockList },
  { type: "kpi-locks", title: "Open locks", description: "How many locks are on.", sizes: ["small"], defaultSize: "small", Body: OpenLocks },
];

export const widgetByType = (type: string) => WIDGETS.find((w) => w.type === type);
