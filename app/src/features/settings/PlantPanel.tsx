"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useSetThreshold, useSettings, useTools } from "@/features/hooks";
import { Button, Pill } from "@/ui/atoms";
import { DataTable, ErrorState, KeyValues, LoadingRows } from "@/ui/cells";

const PCT = 100;

/** The engine's fast-route threshold, retention and the tools the engine may call (§10, §22). */
export function PlantPanel() {
  const settings = useSettings();
  const tools = useTools();
  if (settings.isPending) return <LoadingRows rows={6} />;
  if (settings.isError) return <ErrorState what="plant settings" onRetry={() => settings.refetch()} />;
  const s = settings.data;
  return (
    <div className="flex flex-col gap-8">
      <Threshold key={s.fastRouteThreshold} value={s.fastRouteThreshold} />
      <section className="flex max-w-2xl flex-col gap-3">
        <h2 className="text-section font-medium">Retention and terminals</h2>
        <KeyValues rows={[
          { k: "Evidence", v: `${s.retentionDays.evidence} days` },
          { k: "Dictation audio", v: `${s.retentionDays.audio} days, then only the transcript remains` },
          { k: "Cases", v: `${s.retentionDays.cases} days` },
          { k: "Panel PC locks after", v: `${s.terminalLockMin.panel} min idle` },
          { k: "Workshop PC locks after", v: `${s.terminalLockMin.workshop} min idle` },
        ]} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-section font-medium">Engine tools</h2>
        <p className="text-body text-muted">What the engine may read while it proposes. No tool can approve, sign or verify anything that touches safety.</p>
        {tools.data && <DataTable label="Engine tools" rows={tools.data} rowKey={(t) => t.name} columns={[
          { key: "n", label: "Tool", cell: (t) => <code className="font-mono text-small">{t.name}</code> },
          { key: "v", label: "Version", cell: (t) => <span className="num text-muted">{t.version}</span> },
          { key: "k", label: "Kind", cell: (t) => (t.kind === "read" ? "Reads" : "Reasons") },
          { key: "d", label: "What it does", cell: (t) => <span className="text-muted">{t.description}</span> },
          { key: "e", label: "State", cell: (t) => <Pill tone={t.enabled ? "positive" : "neutral"}>{t.enabled ? "On" : "Off"}</Pill> },
        ]} />}
      </section>
    </div>
  );
}

function Threshold({ value }: { value: number }) {
  const save = useSetThreshold();
  const [v, setV] = useState(value);
  return (
    <section className="flex max-w-2xl flex-col gap-3">
      <h2 className="text-section font-medium">Fast route threshold</h2>
      <p className="text-body text-muted">Above this similarity to an earlier case the engine proposes at once; below it, it reads the manuals and takes longer.</p>
      <div className="flex items-center gap-4">
        <input type="range" min={0.5} max={0.99} step={0.01} value={v} onChange={(e) => setV(Number(e.target.value))} aria-label="Fast route threshold" className="w-72 accent-[var(--accent)]" />
        <span className="w-14 text-section font-medium num">{Math.round(v * PCT)} %</span>
        <Button variant="primary" disabled={v === value || save.isPending} onClick={() => save.mutate(v, { onSuccess: () => toast.success("Threshold saved", { description: "New proposals use it from now on." }) })}>Save</Button>
      </div>
    </section>
  );
}
