"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeviceId } from "@/features/cases/shared";
import { useLocks, useMe, useSafetyPolicy } from "@/features/hooks";
import { VerifyConfirm } from "@/features/kiosk/VerifyScreen";
import type { Lock, Me, SafetyPolicy } from "@/lib/api";
import { lockStateLabel } from "@/lib/labels";
import { Pill, buttonStyles } from "@/ui/atoms";
import { EmptyState, ErrorState, LoadingRows, PageHeader } from "@/ui/cells";
import { Canvas } from "@/ui/templates/ShellLayout";

/** Shift leads and named verifiers can verify from their own signed-in device, not only from a terminal. */
export function canVerifyFromLaptop(me: Me | undefined, policy: SafetyPolicy | undefined): boolean {
  return !!me && (me.roles.includes("lead") || !!policy?.verifiers.includes(me.id));
}

export function verifyPath(l: Lock, laptop: boolean): string {
  const removal = l.state === "removal_pending" ? "&removal=1" : "";
  return `${laptop ? "/safety/verify" : "/kiosk/verify"}?lock=${l.id}${removal}`;
}

/**
 * The second person's half of a lockout from a lead's laptop (§29.4). Same server rules as the terminal:
 * the person who applied the lock and the device that applied it are refused, and the scan must match.
 */
export function LaptopVerifyScreen() {
  const params = useSearchParams();
  const { data: me } = useMe();
  const policy = useSafetyPolicy();
  const locks = useLocks();
  const deviceId = useDeviceId();
  const lockId = params.get("lock");
  const removal = params.get("removal") === "1";
  const header = <PageHeader title="Verify a lock" subline="As the second person, from your own device. The terminal flow stays available." />;
  if (locks.isPending || policy.isPending || !me) return <Canvas>{header}<LoadingRows rows={4} pitch="h-12" /></Canvas>;
  if (locks.isError) return <Canvas>{header}<ErrorState what="locks" onRetry={() => locks.refetch()} /></Canvas>;
  if (!canVerifyFromLaptop(me, policy.data)) return (
    <Canvas>{header}<EmptyState>Only shift leads and named verifiers can verify a lock. Ask one, or use a terminal with someone who can.</EmptyState></Canvas>
  );
  const all = locks.data ?? [];
  const lock = lockId ? all.find((l) => l.id === lockId) : undefined;
  if (!lockId) {
    const waiting = all.filter((l) => l.state === "applied" || l.state === "removal_pending");
    return (
      <Canvas>
        {header}
        {!waiting.length ? <EmptyState>No lock is waiting for verification.</EmptyState> : (
          <ul className="flex flex-col divide-y divide-rule rounded-card border border-border">
            {waiting.map((l) => (
              <li key={l.id}><Link href={verifyPath(l, true)} className="flex items-center gap-3 px-4 py-3 text-body hover:bg-raised">
                <span className="font-medium">{l.id}</span><span className="text-muted">{l.point}</span><Pill className="ml-auto" tone="warning">{lockStateLabel[l.state]}</Pill>
              </Link></li>
            ))}
          </ul>
        )}
      </Canvas>
    );
  }
  return (
    <Canvas>
      {header}
      <div className="max-w-2xl">
        {!lock ? (
          <div className="flex flex-col gap-3"><EmptyState>No lock {lockId} is registered.</EmptyState><Link href="/safety" className={buttonStyles({ variant: "ghost" })}>Back to Safety</Link></div>
        ) : (
          <VerifyConfirm lock={lock} removal={removal} verifier={me} deviceId={deviceId} />
        )}
      </div>
    </Canvas>
  );
}
