"use client";
import { useMemo } from "react";
import { toast } from "sonner";
import { useMachines, useMe, useProcedures, useUsers } from "@/features/hooks";
import { useStation } from "@/features/session";
import { Problem, type Case, type Lock, type Step } from "@/lib/api/types";
import { MOCK_NOW } from "@/lib/clock";

export const isOpen = (c: Case) => c.status !== "closed";
const SEV_RANK = { high: 0, medium: 1, low: 2 } as const;
export const bySeverity = (a: Case, b: Case) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || Date.parse(a.openedAt) - Date.parse(b.openedAt);

/** Lookups every case screen needs: machine by id, a person's name, a procedure by its id. */
export function useLookups() {
  const machines = useMachines();
  const users = useUsers();
  const procs = useProcedures();
  return useMemo(() => ({
    machine: (id: string) => machines.data?.find((m) => m.id === id),
    person: (id: string | null) => (id ? users.data?.find((u) => u.id === id) : undefined),
    procedure: (id: string) => procs.data?.find((p) => p.id === id),
    users: users.data ?? [],
    machines: machines.data ?? [],
    procedures: procs.data ?? [],
  }), [machines.data, users.data, procs.data]);
}

/** The device this screen is: the shared terminal when the kiosk opened it, otherwise the person's own device. */
export function useDeviceId() {
  const { data: me } = useMe();
  const station = useStation();
  return station.terminalId ?? me?.deviceId ?? "d-unknown";
}

/** Server refusals are Problem Details; show their title as the one line the person needs (§24.13). */
export function showProblem(e: unknown) {
  if (e instanceof Problem) toast.error(e.title, { description: e.type });
  else toast.error("Something went wrong. Try again.");
}

/** The lock a safety step works on: for "apply" the one it put on, for "remove" the one on the same point in this case. */
export function lockForStep(locks: Lock[] | undefined, c: Case, step: Step): Lock | undefined {
  if (!step.lock || !locks) return undefined;
  const mine = locks.filter((l) => l.caseId === c.id);
  return step.lock.action === "apply" ? mine.find((l) => l.stepKey === step.key) : mine.find((l) => l.point === step.lock!.point);
}

export const minutesSince = (iso: string) => Math.max(0, Math.round((MOCK_NOW - Date.parse(iso)) / 60000));

/** Version ids end in their number (`pv-ext-003-3`), so the approved one is found from the summary. */
export const versionIdOf = (p: { versions: string[] }, n: number | null) => (n === null ? null : p.versions.find((id) => id.endsWith(`-${n}`)) ?? null);
