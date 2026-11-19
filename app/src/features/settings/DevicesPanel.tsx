"use client";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useBadges, useDevices, useEnrollTerminal, useRevokeBadge, useRevokeDevice, useUsers } from "@/features/hooks";
import type { Density } from "@/lib/api/types";
import { fmtAgo, fmtDate } from "@/lib/format";
import { densityInfo, deviceKindLabel } from "@/lib/labels";
import { Button, HoldButton, Input, Pill, Select } from "@/ui/atoms";
import { DataTable, ErrorState, Field, fieldProps, LoadingRows, Sheet } from "@/ui/cells";

/** Phones, shared terminals and personal computers, and the badges that open the terminals (§15.11, ADR-A39). */
export function DevicesPanel() {
  const devices = useDevices();
  const badges = useBadges();
  const users = useUsers();
  const revoke = useRevokeDevice();
  const revokeBadge = useRevokeBadge();
  const [enrolling, setEnrolling] = useState(false);
  const nameOf = (id: string) => users.data?.find((u) => u.id === id)?.name ?? id;

  if (devices.isPending) return <LoadingRows rows={6} pitch="h-14" />;
  if (devices.isError) return <ErrorState what="devices" onRetry={() => devices.refetch()} />;
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-section font-medium">Devices</h2>
          <Button variant="primary" onClick={() => setEnrolling(true)}><Plus />Enrol a terminal</Button>
        </div>
        <DataTable label="Devices" rows={devices.data} rowKey={(d) => d.id} minWidth={880} columns={[
          { key: "n", label: "Name", cell: (d) => <span className="font-medium">{d.name}</span> },
          { key: "k", label: "Kind", cell: (d) => deviceKindLabel[d.kind] },
          { key: "a", label: "Area", cell: (d) => <span className="text-muted">{d.area}{d.line ? ` · ${d.line}` : ""}</span> },
          { key: "d", label: "Density", cell: (d) => (d.density ? densityInfo[d.density].label : <span className="text-muted">Person&apos;s choice</span>) },
          { key: "s", label: "Last sync", cell: (d) => <span className="text-muted">{fmtAgo(d.lastSeenAt)}{d.pendingOps ? ` · ${d.pendingOps} pending` : ""}</span> },
          { key: "st", label: "Status", cell: (d) => <Pill tone={d.status === "active" ? "positive" : "neutral"}>{d.status === "active" ? "Active" : "Revoked"}</Pill> },
          { key: "x", label: <span className="sr-only">Actions</span>, className: "w-40 text-right", cell: (d) => d.status === "active" && (
            <HoldButton size="sm" variant="danger" doneLabel="Revoked" onConfirm={() => revoke.mutateAsync(d.id).then(() => toast.success(`${d.name} revoked`, { description: "Its sessions end now; queued operations are discarded." }))}>Hold to revoke</HoldButton>
          ) },
        ]} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-section font-medium">Badges</h2>
        <p className="text-body text-muted">A badge opens a shared terminal with the person&apos;s PIN. Araxos keeps only a hash of the badge code.</p>
        {badges.data && <DataTable label="Badges" rows={badges.data} rowKey={(b) => b.id} columns={[
          { key: "p", label: "Person", cell: (b) => <span className="font-medium">{nameOf(b.userId)}</span> },
          { key: "h", label: "Badge hash", cell: (b) => <code className="font-mono text-small">{b.hash.slice(0, 12)}…</code> },
          { key: "i", label: "Issued", cell: (b) => <span className="text-muted">{fmtDate(b.issuedAt)}</span> },
          { key: "u", label: "Last used", cell: (b) => <span className="text-muted">{fmtAgo(b.lastUsedAt)}</span> },
          { key: "x", label: <span className="sr-only">Actions</span>, className: "w-40 text-right", cell: (b) => (b.status === "active"
            ? <HoldButton size="sm" variant="danger" doneLabel="Revoked" onConfirm={() => revokeBadge.mutateAsync(b.id).then(() => toast.success("Badge revoked"))}>Hold to revoke</HoldButton>
            : <Pill>Revoked</Pill>) },
        ]} />}
      </section>
      <Sheet open={enrolling} onOpenChange={setEnrolling} title="Enrol a shared terminal" description="The code works once, for ten minutes, on the terminal you are setting up.">
        <EnrolForm onDone={() => setEnrolling(false)} />
      </Sheet>
    </div>
  );
}

function EnrolForm({ onDone }: { onDone: () => void }) {
  const enrol = useEnrollTerminal();
  const [name, setName] = useState("Workshop 4");
  const [area, setArea] = useState("Maintenance workshop");
  const [density, setDensity] = useState<Density>("workshop");
  const code = enrol.data?.code;
  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      {code ? (
        <>
          <p className="text-body">Type this code on the terminal&apos;s first screen:</p>
          <p className="rounded-control bg-raised px-4 py-5 text-center font-mono text-title tracking-[0.3em] num">{code}</p>
          <Button onClick={onDone}>Done</Button>
        </>
      ) : (
        <>
          <Field label="Name">{(f) => <Input {...fieldProps(f)} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          <Field label="Area">{(f) => <Input {...fieldProps(f)} value={area} onChange={(e) => setArea(e.target.value)} />}</Field>
          <Field label="Density" help={densityInfo[density].help}>{(f) => (
            <Select {...fieldProps(f)} value={density} onChange={(e) => setDensity(e.target.value as Density)}>
              {(["workshop", "panel", "wall"] as const).map((d) => <option key={d} value={d}>{densityInfo[d].label}</option>)}
            </Select>
          )}</Field>
          <Button variant="primary" disabled={!name.trim() || enrol.isPending} onClick={() => enrol.mutate({ name, area, density })}>Create enrolment code</Button>
        </>
      )}
    </div>
  );
}
