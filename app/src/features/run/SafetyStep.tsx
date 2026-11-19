"use client";
import { Camera, Copy, ExternalLink, Lock as LockIcon, ScanLine, ShieldCheck, UserRoundCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TotpQr } from "@/features/access/TotpQr";
import { showProblem } from "@/features/cases/shared";
import { useApplyLock, useRequestRemoval } from "@/features/hooks";
import type { Case, Lock, Step, StepRun } from "@/lib/api/types";
import { fmtTime } from "@/lib/format";
import { lockStateLabel } from "@/lib/labels";
import { Button, HoldButton, Input, Pill } from "@/ui/atoms";
import { Field, fieldProps } from "@/ui/cells";

/** Locks the panel takes from the station's lock board in the mock. */
const FREE_LOCKS = ["L-21", "L-22", "L-23"];
const SAFETY_HOLD_MS = 1200;

/**
 * T4: a safety step is never a checkbox. Applying a lock is scan the point, fit the lock, photograph it and hold;
 * then a second person verifies it from their own device (§29.4). The step moves on only after that.
 */
export function SafetyStep({ c, step, run, lock, deviceId, onPhoto, current }: {
  c: Case; step: Step; run: StepRun; lock: Lock | undefined; deviceId: string; onPhoto: () => void; current: boolean;
}) {
  const spec = step.lock!;
  const apply = useApplyLock();
  const removal = useRequestRemoval();
  const [point, setPoint] = useState("");
  const [lockId, setLockId] = useState("");
  const photo = run.evidence.some((e) => e.kind === "photo");

  const header = (
    <div className="flex flex-wrap items-center gap-3 rounded-card bg-[var(--pill-negative-bg)] px-4 py-3 text-[var(--pill-negative-ink)]">
      <LockIcon className="size-5" aria-hidden />
      <span className="text-body font-medium">{spec.action === "apply" ? "Lock out" : "Remove the lock"} {spec.point}</span>
      <span className="text-body">· {spec.energy}</span>
      <span className="ml-auto text-small">Two people · two devices</span>
    </div>
  );

  if (spec.action === "apply" && !lock) {
    if (!current) return <div className="flex flex-col gap-3">{header}<p className="text-body text-muted">Not reached yet.</p></div>;
    return (
      <div className="flex flex-col gap-4">
        {header}
        <ol className="flex flex-col gap-4">
          <li className="flex flex-col gap-2">
            <Field label="1. Scan the isolation point" help={`The tag on ${spec.point} carries a QR. A barcode reader types it here.`}>{(f) => (
              <div className="flex gap-2"><Input {...fieldProps(f)} value={point} onChange={(e) => setPoint(e.target.value.toUpperCase())} placeholder={spec.point} className="font-mono" />
                <Button variant="outline" onClick={() => setPoint(spec.point)}><ScanLine />Scan</Button></div>
            )}</Field>
          </li>
          <li className="flex flex-col gap-2">
            <Field label="2. Fit your lock and scan it" help="Your personal lock from the board.">{(f) => (
              <div className="flex gap-2"><Input {...fieldProps(f)} value={lockId} onChange={(e) => setLockId(e.target.value.toUpperCase())} placeholder="L-21" className="font-mono" />
                <Button variant="outline" onClick={() => setLockId(FREE_LOCKS[0])}><ScanLine />Scan</Button></div>
            )}</Field>
          </li>
          <li className="flex items-center gap-3">
            <span className="text-body font-medium">3. Photo of the lock in place</span>
            {photo ? <Pill tone="positive">Taken</Pill> : <Button variant="outline" onClick={onPhoto}><Camera />Take photo</Button>}
          </li>
        </ol>
        <HoldButton
          variant="primary" size="lg" data-main-action holdMs={SAFETY_HOLD_MS} doneLabel="Lock applied" disabled={!point || !lockId || !photo || apply.isPending}
          onConfirm={() => apply.mutateAsync({ caseId: c.id, stepKey: step.key, point, lockId, photo, deviceId }).then(() => toast.success(`${lockId} on ${point}`, { description: "Now a second person has to verify it." })).catch(showProblem)}
        >Hold to apply the lock</HoldButton>
      </div>
    );
  }

  if (!lock) return <div className="flex flex-col gap-3">{header}<p className="text-body text-muted">No lock from this case is on {spec.point}.</p></div>;
  const waitingApply = lock.state === "applied" && spec.action === "apply";
  const waitingRemoval = lock.state === "removal_pending" && spec.action === "remove";
  return (
    <div className="flex flex-col gap-4">
      {header}
      <p className="flex flex-wrap items-center gap-3 text-body">
        <span className="font-medium">{lock.id}</span> on {lock.point} · applied {fmtTime(lock.appliedAt)}
        <Pill tone={lock.state === "verified" ? "positive" : lock.state === "removed" ? "neutral" : "warning"}>{lockStateLabel[lock.state]}</Pill>
      </p>
      {(waitingApply || waitingRemoval) && <Handoff lock={lock} removal={waitingRemoval} />}
      {spec.action === "remove" && lock.state === "verified" && current && (
        <div className="flex flex-col gap-3">
          <p className="text-body">Clear the area and remove your lock. Then a second person confirms it from their own device.</p>
          <HoldButton variant="primary" size="lg" data-main-action holdMs={SAFETY_HOLD_MS} doneLabel="Removal requested"
            onConfirm={() => removal.mutateAsync(lock.id).then(() => toast.success("Removal requested", { description: "Waiting for a second person." })).catch(showProblem)}>
            Hold to remove the lock
          </HoldButton>
        </div>
      )}
      {spec.action === "apply" && lock.state !== "applied" && lock.verifiedAt && (
        <p className="flex items-center gap-2 text-body text-muted"><ShieldCheck className="size-4" aria-hidden />Verified {fmtTime(lock.verifiedAt)} on another device.</p>
      )}
    </div>
  );
}

/** The verifier's way in: the QR the second person scans, or a link to open on another terminal. */
function Handoff({ lock, removal }: { lock: Lock; removal: boolean }) {
  const path = `/kiosk/verify?lock=${lock.id}${removal ? "&removal=1" : ""}`;
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;
  return (
    <div className="flex flex-wrap items-center gap-5 rounded-card border border-border p-4" role="status" aria-live="polite">
      <TotpQr seed={url} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="flex items-center gap-2 text-section font-medium"><UserRoundCheck className="size-5" aria-hidden />Waiting for a second person</p>
        <p className="text-body text-muted">Someone else, on their own phone or another terminal, scans this code or {lock.id} itself and confirms it with their badge. You cannot verify your own lock.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.open(path, "araxos-verify", "popup,width=1100,height=800")}><ExternalLink />Open as another terminal</Button>
          <Button variant="ghost" onClick={() => { void navigator.clipboard?.writeText(url); toast("Link copied"); }}><Copy />Copy link</Button>
        </div>
      </div>
    </div>
  );
}
