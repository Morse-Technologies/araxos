"use client";
import { CircleSlash, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAccept, useCase, useCreateIncident, usePropose } from "@/features/hooks";
import type { Case, Proposal, Severity } from "@/lib/api/types";
import { ABSTAIN_TEXT, routeLabel, severityLabel, SEVERITY_ORDER } from "@/lib/labels";
import { Button, HoldButton, Select, Spinner, Textarea } from "@/ui/atoms";
import { CitationChip, ConfidenceGlyph, Field, PageHeader, Segmented, Steps } from "@/ui/cells";
import { Canvas } from "@/ui/templates/ShellLayout";
import { showProblem, useLookups, versionIdOf } from "./shared";

/** A3 + A4: describe the incident, then the engine proposes a procedure with its reasons, or abstains. */
export function NewIncident() {
  const params = useSearchParams();
  const resume = params.get("case");
  const { data: existing } = useCase(resume);
  const [c, setC] = useState<Case | null>(null);
  const current = c ?? existing ?? null;
  return (
    <Canvas className="max-w-[880px]">
      <PageHeader title="New incident" subline="Say what you see. Araxos looks for an approved procedure and tells you why it picked it." />
      <div className="mt-6"><Steps steps={["Describe", "Proposal", "Work"]} current={current ? 1 : 0} /></div>
      <div className="mt-8">{current ? <ProposalStep c={current} /> : <Describe onCreated={setC} />}</div>
    </Canvas>
  );
}

function Describe({ onCreated }: { onCreated: (c: Case) => void }) {
  const look = useLookups();
  const create = useCreateIncident();
  const [machineId, setMachine] = useState("");
  const [symptom, setSymptom] = useState("");
  const [severity, setSeverity] = useState<Severity>("medium");
  return (
    <div className="flex flex-col gap-5" data-compact>
      <Field label="Machine" help="Scan its QR on a phone; here, pick it from the list.">{(f) => (
        <Select {...f} value={machineId} onChange={(e) => setMachine(e.target.value)}>
          <option value="">Choose a machine</option>
          {look.machines.map((m) => <option key={m.id} value={m.id}>{m.code} · {m.name} · {m.area}</option>)}
        </Select>
      )}</Field>
      <Field label="What is happening?" help="In your words. The engine reads it, nobody grades it.">{(f) => (
        <Textarea {...f} rows={4} value={symptom} onChange={(e) => setSymptom(e.target.value)} placeholder="Drive-end bearing noise and heat on the reducer" />
      )}</Field>
      <div className="flex flex-col gap-2">
        <span className="text-body font-medium">Urgency</span>
        <Segmented label="Urgency" value={severity} onChange={setSeverity} options={SEVERITY_ORDER.map((s) => ({ value: s, label: severityLabel[s] }))} />
      </div>
      <div>
        <Button variant="primary" size="lg" data-main-action disabled={!machineId || symptom.trim().length < 6 || create.isPending}
          onClick={() => create.mutate({ machineId, symptom: symptom.trim(), severity }, { onSuccess: onCreated, onError: showProblem })}>
          <Sparkles />Find a procedure
        </Button>
      </div>
    </div>
  );
}

function ProposalStep({ c }: { c: Case }) {
  const router = useRouter();
  const look = useLookups();
  const propose = usePropose();
  const accept = useAccept();
  const asked = useRef(false);
  const [p, setP] = useState<Proposal | null>(c.proposal);
  const [other, setOther] = useState("");
  const { mutate } = propose;
  useEffect(() => {
    if (asked.current || c.proposal) return;
    asked.current = true;
    mutate(c.id, { onSuccess: setP, onError: showProblem });
  }, [c.id, c.proposal, mutate]);

  const m = look.machine(c.machineId);
  const approved = look.procedures.filter((x) => x.approved && x.machineKind === m?.kind);
  const go = (versionId: string | null) => accept.mutateAsync({ caseId: c.id, versionId }).then(() => router.push(versionId ? `/cases/${c.id}/run` : `/cases?id=${c.id}`)).catch(showProblem);
  const proc = p?.versionId ? look.procedures.find((x) => x.versions.includes(p.versionId!)) : undefined;

  if (!p) return (
    <div role="status" className="flex items-center gap-3 rounded-card border border-border p-6 text-body text-muted">
      <Spinner />Reading similar cases, the approved procedures and the manuals for {m?.code}…
    </div>
  );
  return (
    <div className="flex flex-col gap-5">
      <p className="text-small text-muted"><span className="num">{c.code}</span> · {m?.code} {m?.name} · {c.symptom}</p>
      {p.route === "abstain" ? (
        <section className="flex flex-col gap-4 rounded-card border border-border p-6">
          <h2 className="flex items-center gap-2 text-section font-medium"><CircleSlash className="size-4" aria-hidden />{routeLabel.abstain}</h2>
          <p className="text-body">{ABSTAIN_TEXT}</p>
          {p.reason && <p className="text-body text-muted">{p.reason}</p>}
          <div><Button variant="primary" size="lg" data-main-action onClick={() => go(null)}>Work without a procedure</Button></div>
        </section>
      ) : (
        <section className="flex flex-col gap-4 rounded-card border border-border p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-section font-medium">{p.diagnosis}</h2>
            <span className="flex items-center gap-3 text-small text-muted">{routeLabel[p.route]}{p.confidence && <ConfidenceGlyph confidence={p.confidence} />}</span>
          </div>
          {proc && <p className="text-body">Procedure <span className="font-medium">{proc.code} v{proc.approved}</span> · {proc.title} · about {proc.minutes} min</p>}
          <div className="flex flex-col gap-2">
            <span className="text-small text-muted">Why</span>
            <div className="flex flex-wrap gap-2">{p.why.map((w) => <CitationChip key={w.ref} cite={w} />)}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <HoldButton variant="primary" size="lg" data-main-action doneLabel="Started" after onConfirm={() => go(p.versionId)}>Hold to start this procedure</HoldButton>
            <Button variant="ghost" onClick={() => go(null)}>Work without it</Button>
          </div>
        </section>
      )}
      {approved.length > 0 && (
        <section className="flex flex-wrap items-end gap-3">
          <div className="w-80">
            <Field label="Or pick another approved procedure">{(f) => (
              <Select {...f} value={other} onChange={(e) => setOther(e.target.value)}>
                <option value="">Choose</option>
                {approved.map((x) => <option key={x.id} value={versionIdOf(x, x.approved) ?? ""}>{x.code} v{x.approved} · {x.title}</option>)}
              </Select>
            )}</Field>
          </div>
          <Button variant="outline" disabled={!other} onClick={() => go(other)}>Use it</Button>
        </section>
      )}
    </div>
  );
}
