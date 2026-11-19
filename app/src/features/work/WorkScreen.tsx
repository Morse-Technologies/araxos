"use client";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { bySeverity, isOpen, showProblem, useDeviceId, useLookups } from "@/features/cases/shared";
import {
  PLANT_ID, useCases, useDevices, useLocks, useMe, usePlants, useReassign, useSafetyPolicy, useVersion,
} from "@/features/hooks";
import type { Case, Lock, Me } from "@/lib/api/types";
import { fmtAgo, fmtTime } from "@/lib/format";
import { lockStateLabel } from "@/lib/labels";
import { Button, buttonStyles } from "@/ui/atoms";
import { Card, CaseStatusPill, EmptyState, ErrorState, LoadingRows, PageHeader, Segmented, SeverityGlyph } from "@/ui/cells";
import { Canvas } from "@/ui/templates/ShellLayout";
import { verifyPath } from "@/features/safety/LaptopVerifyScreen";

/** T2: the signed-in person's queue — continue, assigned, unassigned nearby, and locks waiting for them. */
export function WorkScreen() {
  const me = useMe();
  const cases = useCases();
  if (me.isPending || cases.isPending) return <Canvas><LoadingRows rows={8} pitch="h-14" /></Canvas>;
  if (me.isError || !me.data) return <Canvas><ErrorState what="your session" onRetry={() => me.refetch()} /></Canvas>;
  if (cases.isError) return <Canvas><ErrorState what="cases" onRetry={() => cases.refetch()} /></Canvas>;
  return <WorkBody me={me.data} cases={cases.data ?? []} />;
}

function useWorkQueues(me: Me, cases: Case[]) {
  const locks = useLocks();
  const policy = useSafetyPolicy();
  const mine = cases.filter((c) => isOpen(c) && c.assigneeId === me.id).sort(bySeverity);
  const continueCase = mine.find((c) => c.status === "in_progress") ?? null;
  const canVerify = me.roles.includes("lead") || !!policy.data?.verifiers.includes(me.id);
  const waitingLocks = canVerify
    ? (locks.data ?? []).filter((l) => (l.state === "applied" || l.state === "removal_pending") && l.appliedBy !== me.id)
    : [];
  return {
    continueCase,
    otherMine: mine.filter((c) => c.id !== continueCase?.id),
    unassigned: cases.filter((c) => isOpen(c) && !c.assigneeId).sort(bySeverity),
    canVerify,
    waitingLocks,
  };
}

function WorkBody({ me, cases }: { me: Me; cases: Case[] }) {
  const plants = usePlants();
  const devices = useDevices();
  const deviceId = useDeviceId();
  const look = useLookups();
  const q = useWorkQueues(me, cases);
  const plant = plants.data?.find((p) => p.id === (me.plantId || PLANT_ID));
  const device = devices.data?.find((d) => d.id === deviceId);
  const sync = device ? `Synced ${fmtAgo(device.lastSeenAt)} · ${device.pendingOps} pending` : "Syncing…";
  const codeOf = (id: string) => look.machine(id)?.code ?? "—";

  return (
    <Canvas>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="My work"
          subline={`Hello, ${me.name}. ${plant?.name ?? "Plant"} · ${sync}`}
          actions={(
            <Link href="/cases/new" data-main-action className={buttonStyles({ variant: "primary", size: "lg" })}>
              <Plus />New incident
            </Link>
          )}
        />
        {q.continueCase && <ContinueCard c={q.continueCase} machineCode={codeOf(q.continueCase.machineId)} />}
        <AssignedList rows={q.otherMine} machineCode={codeOf} />
        <UnassignedList rows={q.unassigned} me={me} machineCode={codeOf} areaOf={(id) => look.machine(id)?.area ?? ""} />
        {q.canVerify && <LocksWaiting rows={q.waitingLocks} machineCode={codeOf} />}
      </div>
    </Canvas>
  );
}

function ContinueCard({ c, machineCode }: { c: Case; machineCode: string }) {
  const { data: version } = useVersion(c.versionId);
  const done = c.steps.filter((s) => s.state === "done").length;
  const current = c.steps.find((s) => s.state === "current");
  const title = version?.steps.find((s) => s.key === current?.key)?.title ?? "Next step";
  return (
    <Card id="continue" title="Continue" aside={`${done} of ${c.steps.length} steps`}>
      <Link href={`/cases/${c.id}/run`} className="flex flex-col gap-2 py-3 transition-opacity hover:opacity-80">
        <span className="flex items-center gap-2 text-small text-muted">
          <SeverityGlyph severity={c.severity} label={false} />
          <span className="font-medium text-text">{machineCode}</span>
          <span className="num">{c.code}</span>
        </span>
        <span className="text-body">{c.symptom}</span>
        <span className="text-small text-muted">Current: {title}</span>
      </Link>
    </Card>
  );
}

function AssignedList({ rows, machineCode }: { rows: Case[]; machineCode: (id: string) => string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-section font-medium">Assigned to you</h2>
      {!rows.length ? <EmptyState>No other open cases assigned to you.</EmptyState> : (
        <ul className="flex flex-col divide-y divide-rule rounded-card border border-border">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/cases?id=${c.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 text-body hover:bg-raised">
                <SeverityGlyph severity={c.severity} label={false} />
                <span className="font-medium">{machineCode(c.machineId)}</span>
                <span className="min-w-0 flex-1 truncate">{c.symptom}</span>
                <CaseStatusPill status={c.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type Scope = "zone" | "all";

/** Unassigned cases in the technician's zones by default; one tap shows the whole plant. */
function UnassignedList({ rows, me, machineCode, areaOf }: { rows: Case[]; me: Me; machineCode: (id: string) => string; areaOf: (machineId: string) => string }) {
  const reassign = useReassign();
  const zoned = me.zones.length > 0;
  const [scope, setScope] = useState<Scope>(zoned ? "zone" : "all");
  const inZone = rows.filter((c) => me.zones.includes(areaOf(c.machineId)));
  const shown = scope === "zone" && zoned ? inZone : rows;
  const elsewhere = rows.length - inZone.length;
  const take = (c: Case) => reassign.mutate(
    { caseId: c.id, userId: me.id },
    { onSuccess: () => toast.success(`You took ${c.code}`), onError: showProblem },
  );
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-section font-medium">Unassigned</h2>
        {zoned && (
          <Segmented label="Unassigned cases" value={scope} onChange={setScope} options={[
            { value: "zone", label: `My zone · ${me.zones.join(", ")}` }, { value: "all", label: "All zones" },
          ]} />
        )}
      </div>
      {!shown.length ? (
        <EmptyState>
          {scope === "zone" && zoned ? `No unassigned case in ${me.zones.join(" or ")}.` : "No open case is waiting for someone."}
          {scope === "zone" && zoned && elsewhere > 0 && <> <button type="button" className="underline" onClick={() => setScope("all")}>Show {elsewhere} in other zones</button></>}
        </EmptyState>
      ) : (
        <ul className="flex flex-col divide-y divide-rule rounded-card border border-border">
          {shown.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-body">
              <SeverityGlyph severity={c.severity} label={false} />
              <span className="font-medium">{machineCode(c.machineId)}</span>
              <span className="min-w-0 flex-1 truncate">{c.symptom}</span>
              {scope === "all" && <span className="text-small text-muted">{areaOf(c.machineId)}</span>}
              <Button size="sm" variant="outline" disabled={reassign.isPending} onClick={() => take(c)}>Take it</Button>
            </li>
          ))}
        </ul>
      )}
      {scope === "zone" && zoned && shown.length > 0 && elsewhere > 0 && (
        <p className="text-small text-muted">{elsewhere} more in other zones. <button type="button" className="underline" onClick={() => setScope("all")}>Show all</button></p>
      )}
    </section>
  );
}

function LocksWaiting({ rows, machineCode }: { rows: Lock[]; machineCode: (id: string) => string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-section font-medium">Locks waiting for you</h2>
      {!rows.length ? <EmptyState>No locks waiting for your verification.</EmptyState> : (
        <ul className="flex flex-col divide-y divide-rule rounded-card border border-border">
          {rows.map((l) => (
            <li key={l.id}>
              <Link
                href={verifyPath(l, true)}
                className="flex flex-wrap items-center gap-3 px-4 py-3 text-body hover:bg-raised"
              >
                <span className="font-medium">{l.id}</span>
                <span className="text-muted">{l.point} · {machineCode(l.machineId)}</span>
                <span className="text-small text-muted">{lockStateLabel[l.state]} · {fmtTime(l.appliedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
