"use client";
import { Mic, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCaptureKnowledge, useTranscribe } from "@/features/hooks";
import type { KnowledgeItem, Step } from "@/lib/api/types";
import { knowledgeKindLabel } from "@/lib/labels";
import { Button, Spinner, Textarea } from "@/ui/atoms";
import { Field, fieldProps, Segmented, Sheet } from "@/ui/cells";
import { showProblem } from "@/features/cases/shared";

type Kind = KnowledgeItem["kind"];
const KINDS = (Object.keys(knowledgeKindLabel) as Kind[]).filter((k) => k !== "photo").map((k) => ({ value: k, label: knowledgeKindLabel[k] }));
const TICK_MS = 1000;

/**
 * T6 + Saber capture: what the technician knows that the procedure does not say. Dictation is transcribed on the
 * plant server; the audio is kept for the retention period and never leaves it.
 */
export function SaberSheet({ open, onOpenChange, caseId, procedureId, step, dictate }: {
  open: boolean; onOpenChange: (o: boolean) => void; caseId: string; procedureId: string | null; step: Step | null; dictate?: boolean;
}) {
  const capture = useCaptureKnowledge();
  const transcribe = useTranscribe();
  const [kind, setKind] = useState<Kind>("step_change");
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && dictate) { setRecording(true); setSeconds(0); }
  }
  useEffect(() => {
    if (!recording) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), TICK_MS);
    return () => clearInterval(t);
  }, [recording]);

  const stop = () => {
    setRecording(false);
    transcribe.mutate(Math.max(seconds, 1), { onSuccess: (t) => setText((x) => (x ? `${x} ${t}` : t)) });
  };
  const save = () => capture.mutate({ caseId, procedureId, stepKey: step?.key ?? null, text: text.trim(), kind }, {
    onSuccess: () => { toast.success("Saved to Saber", { description: "Engineering reviews it before it changes any procedure." }); setText(""); onOpenChange(false); },
    onError: showProblem,
  });

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) setRecording(false); onOpenChange(o); }} title="Tell engineering" description={step ? `About step ${step.n} · ${step.title}` : "About this case"}>
      <div className="flex flex-col gap-4 px-5 py-4" data-compact>
        <Segmented label="What is it?" options={KINDS} value={kind} onChange={setKind} />
        <div className="flex items-center gap-3 rounded-card border border-border p-3">
          {recording ? (
            <>
              <span className="size-2.5 rounded-full bg-negative" aria-hidden />
              <span className="text-body num" role="timer">Recording {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span>
              <Button className="ml-auto" variant="outline" onClick={stop}><Square />Stop</Button>
            </>
          ) : transcribe.isPending ? (
            <span className="flex items-center gap-2 text-body text-muted" role="status"><Spinner />Transcribing on the plant server…</span>
          ) : (
            <>
              <span className="text-body text-muted">Say it instead of typing it.</span>
              <Button className="ml-auto" variant="outline" onClick={() => { setSeconds(0); setRecording(true); }}><Mic />Dictate</Button>
            </>
          )}
        </div>
        <Field label="In your words" help="You can edit the transcript before saving.">{(f) => <Textarea {...fieldProps(f)} rows={5} value={text} onChange={(e) => setText(e.target.value)} />}</Field>
        <Button variant="primary" size="lg" data-main-action disabled={!text.trim() || capture.isPending} onClick={save}>Save to Saber</Button>
      </div>
    </Sheet>
  );
}
