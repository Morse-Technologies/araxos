"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLookups } from "@/features/cases/shared";
import { useCases, useLocks, useMe, useSafetyPolicy, useUsers } from "@/features/hooks";
import type { Lock, LockState, SafetyPolicy } from "@/lib/api/types";
import { clockNow } from "@/lib/clock";
import { fmtDate, fmtTime } from "@/lib/format";
import { lockStateLabel } from "@/lib/labels";
import { Pill, buttonStyles } from "@/ui/atoms";
import { canVerifyFromLaptop, verifyPath } from "./LaptopVerifyScreen";
import { Card, DataTable, EmptyState, ErrorState, KeyValues, KpiStrip, LoadingRows, PageHeader, Segmented } from "@/ui/cells";
import { Canvas } from "@/ui/templates/ShellLayout";

type Filter = "on" | "waiting" | "removed" | "all";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "on", label: "On" }, { value: "waiting", label: "Waiting" },
  { value: "removed", label: "Removed" }, { value: "all", label: "All" },
];
const LOCK_TONE: Record<LockState, "positive" | "warning" | "neutral"> = {
  verified: "positive", applied: "warning", removal_pending: "warning", removed: "neutral",
};
const POLICY_MODE = "Two signatures on the same version hash (engineer + safety approver)";
const POLICY_RULES = [
  "The person who applied a lock cannot verify it.",
  "Verification happens on a different device.",
  "Edits to an approved safety procedure invalidate its signatures.",
  "No MCP client or model can approve, sign or verify a safety step.",
];

function isToday(iso: string | null): boolean {
  return !!iso && fmtDate(iso) === fmtDate(clockNow().toISOString());
}

function matchesFilter(l: Lock, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "on") return l.state === "verified";
  if (filter === "removed") return l.state === "removed";
  return l.state === "applied" || l.state === "removal_pending";
}

function lockKpis(all: Lock[]) {
  return [
    { label: "Locks on", value: all.filter((l) => l.state === "verified").length },
    { label: "Waiting for verification", value: all.filter((l) => l.state === "applied").length },
    { label: "Removals waiting", value: all.filter((l) => l.state === "removal_pending").length },
    { label: "Verified today", value: all.filter((l) => isToday(l.verifiedAt)).length },
  ];
}

/** D5: every lock on the plant, who applied and verified it, plus the dual-signature policy. */
export function SafetyScreen() {
  const locks = useLocks();
  const [filter, setFilter] = useState<Filter>("on");
  if (locks.isPending) return <Canvas><LoadingRows rows={8} pitch="h-12" /></Canvas>;
  if (locks.isError) return <Canvas><ErrorState what="locks" onRetry={() => locks.refetch()} /></Canvas>;
  return <SafetyBody locks={locks.data ?? []} filter={filter} onFilter={setFilter} />;
}

function SafetyBody({ locks, filter, onFilter }: { locks: Lock[]; filter: Filter; onFilter: (f: Filter) => void }) {
  const cases = useCases();
  const users = useUsers();
  const policy = useSafetyPolicy();
  const look = useLookups();
  const rows = useMemo(() => locks.filter((l) => matchesFilter(l, filter)), [locks, filter]);
  const caseCode = (id: string) => cases.data?.find((c) => c.id === id)?.code ?? id;
  const nameOf = (id: string | null) => (id ? look.person(id)?.name ?? id : "—");
  const machine = (id: string) => look.machine(id)?.code ?? "—";
  const { data: me } = useMe();
  const laptop = canVerifyFromLaptop(me, policy.data);

  return (
    <Canvas>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Safety"
          subline="Every lock on in the plant, who applied it and who verified it. Verification is always another person on another device."
        />
        <KpiStrip items={lockKpis(locks)} />
        <Segmented label="Locks" options={FILTERS} value={filter} onChange={onFilter} />
        {!rows.length ? <EmptyState>No locks in this view.</EmptyState>
          : <LocksTable rows={rows} caseCode={caseCode} nameOf={nameOf} machine={machine} laptop={laptop} />}
        {policy.isPending ? <LoadingRows rows={4} pitch="h-10" />
          : policy.isError ? <ErrorState what="the safety policy" onRetry={() => policy.refetch()} />
            : policy.data && <PolicyCard policy={policy.data} nameOf={(id) => users.data?.find((u) => u.id === id)?.name ?? id} />}
      </div>
    </Canvas>
  );
}

function LocksTable({ rows, caseCode, nameOf, machine, laptop }: {
  laptop: boolean; rows: Lock[]; caseCode: (id: string) => string; nameOf: (id: string | null) => string; machine: (id: string) => string;
}) {
  return (
    <DataTable label="Locks" rows={rows} rowKey={(l) => l.id} minWidth={960} columns={[
      { key: "id", label: "Lock", cell: (l) => <span className="font-medium">{l.id}</span> },
      { key: "pt", label: "Point", cell: (l) => l.point },
      { key: "m", label: "Machine", cell: (l) => <span className="font-medium">{machine(l.machineId)}</span> },
      { key: "c", label: "Case", cell: (l) => (
        <Link href={`/cases?id=${l.caseId}`} className="num text-text underline-offset-2 hover:underline">{caseCode(l.caseId)}</Link>
      ) },
      { key: "a", label: "Applied by", cell: (l) => <span className="text-muted">{nameOf(l.appliedBy)} · {fmtTime(l.appliedAt)}</span> },
      { key: "v", label: "Verified by", cell: (l) => (
        l.verifiedBy
          ? <span className="text-muted">{nameOf(l.verifiedBy)} · {l.verifiedAt ? fmtTime(l.verifiedAt) : ""}</span>
          : <span className="text-muted">Waiting</span>
      ) },
      { key: "s", label: "State", cell: (l) => <Pill tone={LOCK_TONE[l.state]}>{lockStateLabel[l.state]}</Pill> },
      { key: "x", label: <span className="sr-only">Verify</span>, className: "w-28 text-right", cell: (l) => (
        (l.state === "applied" || l.state === "removal_pending") && (
          <Link href={verifyPath(l, laptop)} className={buttonStyles({ variant: "outline", size: "sm" })}>Verify</Link>
        )
      ) },
    ]} />
  );
}

function PolicyCard({ policy, nameOf }: { policy: SafetyPolicy; nameOf: (id: string) => string }) {
  const names = (ids: string[]) => ids.map(nameOf).join(", ") || "None";
  return (
    <Card id="policy" title="Safety policy">
      <KeyValues rows={[
        { k: "Mode", v: POLICY_MODE },
        { k: "Engineers", v: names(policy.engineers) },
        { k: "Safety approvers", v: names(policy.safetyApprovers) },
        { k: "Verifiers", v: names(policy.verifiers) },
      ]} />
      <h3 className="mt-4 text-body font-medium">Rules</h3>
      <ul className="mt-2 list-disc space-y-1 pb-3 pl-5 text-body text-muted">
        {POLICY_RULES.map((r) => <li key={r}>{r}</li>)}
      </ul>
    </Card>
  );
}
