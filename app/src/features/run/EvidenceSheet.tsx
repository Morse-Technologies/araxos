"use client";
import { FileUp, MonitorUp, Ruler, StickyNote } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAddEvidence } from "@/features/hooks";
import type { EvidenceKind, Step } from "@/lib/api/types";
import { Button, Input, Textarea } from "@/ui/atoms";
import { Field, fieldProps, Sheet, Tabs } from "@/ui/cells";
import { showProblem } from "@/features/cases/shared";
import { CameraCapture } from "./CameraCapture";

export type EvidenceTab = Exclude<EvidenceKind, "note"> | "note";
const TABS: { value: EvidenceTab; label: string }[] = [
  { value: "photo", label: "Camera" }, { value: "file", label: "File" }, { value: "screen", label: "Screen" }, { value: "measurement", label: "Measurement" }, { value: "note", label: "Note" },
];

/**
 * T5: evidence for the current step, in a 480 px sheet. The camera is the webcam or the terminal's camera (getUserMedia), files come from
 * disk and a screen capture records an HMI or SCADA screen. Every item is hashed on arrival.
 */
export function EvidenceSheet({ open, onOpenChange, caseId, step, tab, onTab, by }: {
  open: boolean; onOpenChange: (o: boolean) => void; caseId: string; step: Step; tab: EvidenceTab; onTab: (t: EvidenceTab) => void; by: string;
}) {
  const add = useAddEvidence();
  const [file, setFile] = useState<string>("");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const photoLabel = step.requirements.find((r) => r.kind === "photo")?.label ?? `Photo of step ${step.n}`;
  const save = (kind: EvidenceKind, label: string, extra: { value?: number; unit?: string; inRange?: boolean; thumb?: string } = {}) =>
    add.mutate({ caseId, stepKey: step.key, evidence: { kind, label, by, value: extra.value ?? null, unit: extra.unit ?? null, inRange: extra.inRange ?? null, thumb: extra.thumb ?? null } }, {
      onSuccess: () => { toast.success("Evidence added", { description: label }); onOpenChange(false); setFile(""); setValue(""); setNote(""); },
      onError: showProblem,
    });
  const n = Number(value.replace(",", "."));
  const inRange = step.range ? n >= step.range.min && n <= step.range.max : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Add evidence" description={`Step ${step.n} · ${step.title}`}>
      <div className="flex flex-col gap-5 px-5 py-4" data-compact>
        <Tabs label="Evidence kind" tabs={TABS} value={tab} onChange={onTab} />
        {tab === "photo" && open && (
          <CameraCapture busy={add.isPending} onUse={(thumb) => save("photo", photoLabel, { thumb })} onSimulate={() => save("photo", photoLabel)} />
        )}
        {tab === "file" && (
          <div className="flex flex-col gap-3">
            <Field label="File" help="Photos from a camera, a PDF report or a log export.">{(f) => <Input {...fieldProps(f)} type="file" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} />}</Field>
            <Button variant="primary" disabled={!file} onClick={() => save("file", file)}><FileUp />Attach {file || "file"}</Button>
          </div>
        )}
        {tab === "screen" && (
          <div className="flex flex-col gap-3">
            <p className="text-body text-muted">Capture an HMI or SCADA screen. You pick the window; Araxos keeps one frame.</p>
            <Button variant="primary" onClick={() => save("screen", `Screen capture · step ${step.n}`)}><MonitorUp />Capture a screen</Button>
          </div>
        )}
        {tab === "measurement" && (
          <div className="flex flex-col gap-3">
            <Field label={step.requirements.find((r) => r.kind === "measurement")?.label ?? "Value"} help={step.range ? `Expected ${step.range.min}–${step.range.max} ${step.range.unit}` : undefined}
              error={value && inRange === false ? step.range?.onOutOfRange : undefined}>
              {(f) => <Input {...fieldProps(f)} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />}
            </Field>
            <Button variant="primary" disabled={!value || Number.isNaN(n)} onClick={() => save("measurement", step.requirements.find((r) => r.kind === "measurement")?.label ?? "Measurement", { value: n, unit: step.range?.unit, inRange })}><Ruler />Record</Button>
          </div>
        )}
        {tab === "note" && (
          <div className="flex flex-col gap-3">
            <Field label="Note">{(f) => <Textarea {...fieldProps(f)} rows={4} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
            <Button variant="primary" disabled={!note.trim()} onClick={() => save("note", note.trim())}><StickyNote />Add note</Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
