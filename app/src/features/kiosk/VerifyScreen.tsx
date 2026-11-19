"use client";
import { CheckCircle2, Lock as LockIcon, ScanLine, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useLookups } from "@/features/cases/shared";
import { useCases, useLocks, useTerminal, useVerifyLock } from "@/features/hooks";
import { useApplyDensity } from "@/features/session";
import { Problem, type Lock, type User } from "@/lib/api";
import { fmtTime } from "@/lib/format";
import { lockStateLabel } from "@/lib/labels";
import { Avatar, Button, HoldButton, Input, Pill, buttonStyles } from "@/ui/atoms";
import { EmptyState, Field, fieldProps } from "@/ui/cells";
import { BadgePin } from "./BadgePin";
import { KioskFrame } from "./KioskFrame";

/** The second terminal in the demo: verification never happens on the device that applied the lock. */
const DEFAULT_TERMINAL = "t-taller3";
const SAFETY_HOLD_MS = 1200;

/**
 * The second person's half of a lockout (§29.4): sign in with your own badge on your own device, scan the lock
 * itself, hold to confirm. The server refuses the person who applied it, the device that applied it and a lock
 * that is not the one on the point. Kept on this screen only, so it never changes the other window's session.
 */
export function VerifyScreen() {
  const params = useSearchParams();
  const terminalId = params.get("terminal") ?? DEFAULT_TERMINAL;
  const lockParam = params.get("lock");
  const removal = params.get("removal") === "1";
  const locks = useLocks();
  const [picked, setPicked] = useState<{ id: string; removal: boolean } | null>(lockParam ? { id: lockParam, removal } : null);
  const [verifier, setVerifier] = useState<User | null>(null);
  useApplyDensity(useTerminal(terminalId).data?.density ?? "workshop");
  const lock = locks.data?.find((l) => l.id === picked?.id);
  const waiting = locks.data?.filter((l) => l.state === "applied" || l.state === "removal_pending") ?? [];

  return (
    <KioskFrame terminalId={terminalId}>
      {!picked ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-title font-medium">Locks waiting for a second person</h2>
          {!waiting.length ? <EmptyState>No lock is waiting for verification.</EmptyState> : (
            <ul className="flex flex-col gap-2">
              {waiting.map((l) => (
                <li key={l.id}><button type="button" onClick={() => setPicked({ id: l.id, removal: l.state === "removal_pending" })} className="flex w-full items-center gap-3 rounded-card border border-border px-4 py-4 text-left text-section hover:bg-raised">
                  <LockIcon className="size-5" aria-hidden /><span className="font-medium">{l.id}</span> on {l.point}<Pill className="ml-auto" tone="warning">{lockStateLabel[l.state]}</Pill>
                </button></li>
              ))}
            </ul>
          )}
        </div>
      ) : !lock ? <EmptyState>No lock {picked.id} is registered.</EmptyState>
        : !verifier ? (
          <div className="flex flex-col gap-6">
            <LockSummary lock={lock} removal={picked.removal} />
            <BadgePin terminalId={terminalId} title="Verifier: scan your badge" onSignedIn={setVerifier} />
          </div>
        ) : <Confirm lock={lock} removal={picked.removal} verifier={verifier} terminalId={terminalId} onSignOut={() => setVerifier(null)} />}
    </KioskFrame>
  );
}

function LockSummary({ lock, removal }: { lock: Lock; removal: boolean }) {
  const look = useLookups();
  const { data: cases } = useCases();
  const c = cases?.find((x) => x.id === lock.caseId);
  return (
    <div className="flex flex-col gap-2 rounded-card bg-[var(--pill-negative-bg)] p-4 text-[var(--pill-negative-ink)]">
      <p className="flex items-center gap-2 text-section font-medium"><ShieldAlert className="size-5" aria-hidden />{removal ? "Verify the removal of" : "Verify"} {lock.id} on {lock.point}</p>
      <p className="text-body">{look.machine(lock.machineId)?.code} · {c?.code} · applied by {look.person(lock.appliedBy)?.name} at {fmtTime(lock.appliedAt)}{lock.photo ? " · photo attached" : ""}</p>
    </div>
  );
}

function Confirm({ lock, removal, verifier, terminalId, onSignOut }: { lock: Lock; removal: boolean; verifier: User; terminalId: string; onSignOut: () => void }) {
  const verify = useVerifyLock();
  const [scanned, setScanned] = useState("");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [done, setDone] = useState(false);
  if (done) return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <CheckCircle2 className="size-12 text-positive" aria-hidden />
      <h2 className="text-title font-medium">{removal ? "Removal verified" : "Lock verified"}</h2>
      <p className="text-body text-muted">{lock.id} on {lock.point}, verified by {verifier.name}. The technician&apos;s screen moves on by itself.</p>
      <Button variant="primary" size="lg" data-main-action onClick={onSignOut}>Sign out of this terminal</Button>
    </div>
  );
  return (
    <div className="flex flex-col gap-5">
      <LockSummary lock={lock} removal={removal} />
      <p className="flex items-center gap-2 text-body"><Avatar name={verifier.name} hue={verifier.hue} size={24} />Signed in as {verifier.name}<button type="button" className="ml-auto text-small text-muted underline" onClick={onSignOut}>Not you?</button></p>
      <Field label={removal ? "Check the lock is off and scan it" : "Go to the point, check the lock and scan it"} help="Scan the code on the lock body, not the case.">{(f) => (
        <div className="flex flex-wrap gap-2">
          <Input {...fieldProps(f)} value={scanned} onChange={(e) => { setScanned(e.target.value.toUpperCase()); setProblem(null); }} placeholder={lock.id} className="w-40 font-mono" />
          <Button variant="outline" onClick={() => { setScanned(lock.id); setProblem(null); }}><ScanLine />Scan {lock.id}</Button>
          <Button variant="ghost" onClick={() => { setScanned("L-99"); setProblem(null); }}>Scan another lock (demo)</Button>
        </div>
      )}</Field>
      {problem && (
        <div role="alert" className="rounded-card border border-negative p-4">
          <p className="text-body font-medium text-negative">{problem.title}</p>
          <p className="mt-1 font-mono text-small text-muted">{problem.type}</p>
        </div>
      )}
      <HoldButton variant="primary" size="lg" data-main-action holdMs={SAFETY_HOLD_MS} doneLabel="Verified" disabled={!scanned || verify.isPending}
        onConfirm={() => verify.mutateAsync({ lockId: lock.id, scanned, verifierId: verifier.id, deviceId: terminalId, removal })
          .then(() => setDone(true)).catch((e: unknown) => setProblem(e instanceof Problem ? e : new Problem("unknown", "Could not verify.")))}>
        Hold to verify
      </HoldButton>
      <Link href="/kiosk/verify" className={buttonStyles({ variant: "ghost" })}>Another lock</Link>
    </div>
  );
}
