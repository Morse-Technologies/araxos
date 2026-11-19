"use client";
import { Camera, FileUp, MonitorUp, Ruler, StickyNote } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAddEvidence } from "@/features/hooks";
import type { EvidenceKind, Step } from "@/lib/api/types";
import { Button, Halftone, Input, Textarea } from "@/ui/atoms";
import { Field, Sheet, Tabs } from "@/ui/cells";
import { showProblem } from "@/features/cases/shared";

export type EvidenceTab = Exclude<EvidenceKind, "note"> | "note";
const TABS: { value: EvidenceTab; label: string }[] = [
  { value: "photo", label: "Camera" }, { value: "file", label: "File" }, { value: "screen", label: "Screen" }, { value: "measurement", label: "Measurement" }, { value: "note", label: "Note" },
];

/**
 * T5: evidence for the current step, in a 480 px sheet. On the desktop the camera is the webcam, files come from
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
  const save = (kind: EvidenceKind, label: string, extra: { value?: number; unit?: string; inRange?: boolean } = {}) =>
    add.mutate({ caseId, stepKey: step.key, evidence: { kind, label, by, value: extra.value ?? null, unit: extra.unit ?? null, inRange: extra.inRange ?? null } }, {
      onSuccess: () => { toast.success("Evidence added", { description: label }); onOpenChange(false); setFile(""); setValue(""); setNote(""); },
      onError: showProblem,
    });
  const n = Number(value.replace(",", "."));
  const inRange = step.range ? n >= step.range.min && n <= step.range.max : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Add evidence" description={`Step ${step.n} · ${step.title}`}>
      <div className="flex flex-col gap-5 px-5 py-4" data-compact>
        <Tabs label="Evidence kind" tabs={TABS} value={tab} onChange={onTab} />
        {tab === "photo" && (
          <div className="flex flex-col gap-3">
            <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-card bg-raised">
              <Halftone className="absolute inset-0 opacity-40" />
              <span className="relative flex items-center gap-2 text-small text-muted"><Camera className="size-4" />Webcam preview (mock)</span>
            </div>
            <Button variant="primary" size="lg" data-main-action onClick={() => save("photo", photoLabel)}><Camera />Take photo</Button>
          </div>
        )}
        {tab === "file" && (
          <div className="flex flex-col gap-3">
            <Field label="File" help="Photos from a camera, a PDF report or a log export.">{(f) => <Input {...f} type="file" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} />}</Field>
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
              {(f) => <Input {...f} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />}
            </Field>
            <Button variant="primary" disabled={!value || Number.isNaN(n)} onClick={() => save("measurement", step.requirements.find((r) => r.kind === "measurement")?.label ?? "Measurement", { value: n, unit: step.range?.unit, inRange })}><Ruler />Record</Button>
          </div>
        )}
        {tab === "note" && (
          <div className="flex flex-col gap-3">
            <Field label="Note">{(f) => <Textarea {...f} rows={4} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
            <Button variant="primary" disabled={!note.trim()} onClick={() => save("note", note.trim())}><StickyNote />Add note</Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
