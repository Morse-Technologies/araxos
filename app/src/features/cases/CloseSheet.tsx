"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useCloseCase } from "@/features/hooks";
import type { Case, CaseClose } from "@/lib/api/types";
import { Button, Input, Textarea } from "@/ui/atoms";
import { Field, fieldProps, Segmented, Sheet } from "@/ui/cells";
import { minutesSince, showProblem } from "./shared";

const HELPED = [{ value: "yes", label: "Yes" }, { value: "partly", label: "Partly" }, { value: "no", label: "No" }] as const;

/** T7 close: cause, solution, parts, time and whether the procedure helped. Open locks block it on the server. */
export function CloseSheet({ c, open, onOpenChange, onClosed }: { c: Case; open: boolean; onOpenChange: (o: boolean) => void; onClosed?: () => void }) {
  const close = useCloseCase();
  const [f, setF] = useState<CaseClose>({ cause: "", solution: "", parts: [], minutes: minutesSince(c.openedAt), helped: "yes", change: "" });
  const [parts, setParts] = useState("");
  const set = (x: Partial<CaseClose>) => setF((p) => ({ ...p, ...x }));
  const submit = () => close.mutate({ caseId: c.id, close: { ...f, parts: parts.split(",").map((p) => p.trim()).filter(Boolean) } }, {
    onSuccess: () => { toast.success(`${c.code} closed`); onOpenChange(false); onClosed?.(); },
    onError: showProblem,
  });
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`Close ${c.code}`} description="What it was and what fixed it. This feeds the next proposal.">
      <div className="flex flex-col gap-4 px-5 py-4" data-compact>
        <Field label="Cause">{(x) => <Input {...fieldProps(x)} value={f.cause} onChange={(e) => set({ cause: e.target.value })} placeholder="Drive-end bearing worn" />}</Field>
        <Field label="Solution">{(x) => <Textarea {...fieldProps(x)} rows={3} value={f.solution} onChange={(e) => set({ solution: e.target.value })} />}</Field>
        <Field label="Parts used" help="Separate with commas.">{(x) => <Input {...fieldProps(x)} value={parts} onChange={(e) => setParts(e.target.value)} placeholder="SKF 6312-2RS" />}</Field>
        <Field label="Minutes of work">{(x) => <Input {...fieldProps(x)} type="number" min={1} value={f.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })} />}</Field>
        <div className="flex flex-col gap-2"><span className="text-body font-medium">Did the procedure help?</span><Segmented label="Did the procedure help?" options={[...HELPED]} value={f.helped} onChange={(helped) => set({ helped })} /></div>
        <Field label="What would you change?" help="Optional. Goes to engineering as Saber.">{(x) => <Textarea {...fieldProps(x)} rows={2} value={f.change} onChange={(e) => set({ change: e.target.value })} />}</Field>
        <Button variant="primary" size="lg" data-main-action disabled={!f.cause.trim() || !f.solution.trim() || close.isPending} onClick={submit}>Close case</Button>
      </div>
    </Sheet>
  );
}
