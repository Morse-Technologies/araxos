"use client";
import { useLicense } from "@/features/hooks";
import { fmtDate } from "@/lib/format";
import { ErrorState, KeyValues, LoadingRows } from "@/ui/cells";

export function LicencePanel() {
  const { data: l, isPending, isError, refetch } = useLicense();
  if (isPending) return <LoadingRows rows={4} />;
  if (isError) return <ErrorState what="the licence" onRetry={() => refetch()} />;
  return (
    <div className="max-w-2xl">
      <KeyValues rows={[
        { k: "Plan", v: `Araxos ${l.plan}` },
        { k: "Holder", v: l.holder },
        { k: "Valid until", v: fmtDate(l.expires) },
        { k: "Shared terminals", v: <span className="num">{l.terminals.used} of {l.terminals.max}</span> },
        { k: "Personal devices", v: <span className="num">{l.devices.used} of {l.devices.max}</span> },
      ]} />
      <p className="mt-4 text-small text-muted">The licence is checked on this server. Araxos never phones home.</p>
    </div>
  );
}
