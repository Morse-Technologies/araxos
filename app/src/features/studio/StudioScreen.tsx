"use client";
import { FilePlus2, FileUp, Mic, Play, Save, Signature } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { showProblem, versionIdOf } from "@/features/cases/shared";
import { useCreateDraft, useDryRun, useMe, useProcedures, useSaveDraft, useSubmit, useVersion, useVersionsOf } from "@/features/hooks";
import type { DryRun, Procedure, ProcedureVersion, Step } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { fmtAgo, fmtTime } from "@/lib/format";
import { Band, Button, HoldButton, Input, Pill, Select, buttonStyles } from "@/ui/atoms";
import { EmptyState, ErrorState, Field, fieldProps, LoadingRows, Modal, Segmented, Sheet, Tabs, VersionPill } from "@/ui/cells";
import { SplitLayout } from "@/ui/templates/ShellLayout";
import { BranchGraph } from "./BranchGraph";
import { DiffView } from "./DiffView";
import { StepsEditor } from "./StepsEditor";

type Tab = "steps" | "branches" | "diff" | "simulate";
const TABS: { value: Tab; label: string }[] = [{ value: "steps", label: "Steps" }, { value: "branches", label: "Branches" }, { value: "diff", label: "Diff" }, { value: "simulate", label: "Simulate" }];
const PDF_DRAFT = "pr-mix-004";

/** The version Studio opens: the one being worked on, else the approved one. */
const workingVersion = (p: Procedure) => versionIdOf(p, p.draft ?? p.approved) ?? p.versions.at(-1)!;

/** E1: procedures on the left; on the right the open version as steps, a branch graph, a diff and a dry run. */
export function StudioScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const procs = useProcedures();
  const [importing, setImporting] = useState(false);
  const pid = params.get("id") ?? procs.data?.[0]?.id ?? null;
  const p = procs.data?.find((x) => x.id === pid);
  const vid = params.get("v") ?? (p ? workingVersion(p) : null);
  const go = (id: string, v?: string) => router.replace(`/studio?id=${id}${v ? `&v=${v}` : ""}`, { scroll: false });

  return (
    <SplitLayout
      list={(
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col gap-3 border-b border-rule p-4">
            <h1 className="text-section font-medium">Studio</h1>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setImporting(true)}><FileUp />Import a PDF</Button>
              <Link href="/studio/interview" className={buttonStyles({ size: "sm", variant: "outline" })}><Mic />From an interview</Link>
            </div>
          </div>
          {procs.isPending ? <LoadingRows rows={6} pitch="h-16" className="p-4" /> : procs.isError ? <ErrorState what="procedures" className="m-4" onRetry={() => procs.refetch()} /> : (
            <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Procedures">
              {procs.data.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => go(x.id)} aria-current={x.id === pid ? "true" : undefined}
                    className={cn("flex w-full flex-col gap-1 border-b border-rule px-4 py-3 text-left hover:bg-raised", x.id === pid && "bg-surface")}>
                    <span className="flex items-center gap-2 text-small text-muted"><span className="font-mono">{x.code}</span><span className="ml-auto">{x.machineKind}</span></span>
                    <span className="text-body">{x.title}</span>
                    <span className="flex gap-2 text-small text-muted">
                      {x.approved ? <span>v{x.approved} approved</span> : <span>Never approved</span>}
                      {x.draft && <Pill tone="warning">v{x.draft} open</Pill>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      detail={(
        <>
          {p && vid ? <Editor key={vid} p={p} versionId={vid} onPick={(v) => go(p.id, v)} /> : <EmptyState className="m-8">Pick a procedure.</EmptyState>}
          <ImportSheet open={importing} onOpenChange={setImporting} onDone={() => { setImporting(false); go(PDF_DRAFT); }} />
        </>
      )}
    />
  );
}

function Editor({ p, versionId, onPick }: { p: Procedure; versionId: string; onPick: (v: string) => void }) {
  const { data: v, isPending, isError, refetch } = useVersion(versionId);
  const versions = useVersionsOf(p.id);
  const { data: me } = useMe();
  const [tab, setTab] = useState<Tab>("steps");
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const save = useSaveDraft();
  const [confirmSave, setConfirmSave] = useState(false);
  const submit = useSubmit();
  const create = useCreateDraft();
  if (isPending) return <LoadingRows rows={8} className="p-8" />;
  if (isError || !v) return <ErrorState what="this version" className="m-8" onRetry={() => refetch()} />;
  const working = steps ?? v.steps;
  const dirty = !!steps && JSON.stringify(steps) !== JSON.stringify(v.steps);
  const editable = v.status === "draft" || v.status === "review" || v.status === "safety_review";
  const approved = versions.data?.find((x) => x.status === "approved" && x.id !== v.id) ?? versions.data?.find((x) => x.n === v.n - 1);
  const persist = () => save.mutateAsync({ versionId: v.id, steps: working, editorId: me!.id }).then((x) => { setSteps(null); return x; });
  const inReview = v.status === "review" || v.status === "safety_review";
  const onSave = () => (inReview ? setConfirmSave(true) : doSave());
  const doSave = () => persist().then((x) => toast.success(inReview ? `v${v.n} is back in draft` : "Draft saved", { description: v.signatures.length ? `The body changed (sha256 ${x.bodySha256.slice(0, 8)}…), so its signatures were cleared.` : `sha256 ${x.bodySha256.slice(0, 8)}…` })).catch(showProblem);
  const onSubmit = () => (dirty ? persist() : Promise.resolve(v)).then(() => submit.mutateAsync(v.id))
    .then((x) => toast.success("Sent to review", { description: x.status === "safety_review" ? "It has safety steps: an engineer and a safety approver both have to sign." : "An engineer has to sign it." })).catch(showProblem);

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5 px-4 py-6 md:px-8 animate-enter">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-small text-muted">
            {v.status === "approved" ? <Band kind="procedure" size="xs">{p.code} v{v.n}</Band> : <span className="font-mono">{p.code} v{v.n}</span>}
            · {p.machineKind} · sha256 <code className="font-mono">{v.bodySha256.slice(0, 12)}</code>
          </p>
          <h2 className="mt-1 text-title font-medium tracking-[-0.01em]">{p.title}</h2>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-small text-muted">
            <VersionPill status={v.status} />
            {(v.status === "review" || v.status === "safety_review") && <span>{v.signatures.length} of {v.status === "safety_review" ? 2 : 1} signatures</span>}
            <span>Changed {fmtAgo(v.createdAt)}{v.changeNote ? ` · ${v.changeNote}` : ""}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {versions.data && versions.data.length > 1 && (
            <Select aria-label="Version" value={v.id} onChange={(e) => onPick(e.target.value)} className="w-40">
              {versions.data.map((x) => <option key={x.id} value={x.id}>v{x.n} · {x.status.replace("_", " ")}</option>)}
            </Select>
          )}
          {!editable && !p.draft && <Button variant="primary" disabled={create.isPending} onClick={() => create.mutate({ fromId: v.id, authorId: me!.id }, { onSuccess: (x) => { toast.success(`Draft v${x.n} created`); onPick(x.id); }, onError: showProblem })}><FilePlus2 />Start a new draft</Button>}
          {editable && <Button variant="outline" disabled={!dirty || save.isPending} onClick={onSave}><Save />Save</Button>}
          {v.status === "draft" && <HoldButton variant="primary" doneLabel="Sent" onConfirm={onSubmit}><Signature />Hold to send to review</HoldButton>}
          {(v.status === "review" || v.status === "safety_review") && <Link href={`/review?v=${v.id}`} className={buttonStyles({ variant: "primary" })}><Signature />Open in Review</Link>}
        </div>
      </header>
      {inReview && (
        <p role="note" className="rounded-card bg-[var(--pill-warning-bg)] px-4 py-3 text-body text-[var(--pill-warning-ink)]">
          {v.signatures.length === 0 ? "This version is in review. Saving any change returns it to draft."
            : `${v.signatures.length === 1 ? "One signature is" : `${v.signatures.length} signatures are`} on this exact text. Saving any change returns it to draft and invalidates ${v.signatures.length === 1 ? "it" : "them"}.`}
        </p>
      )}
      <ConfirmEditInReview open={confirmSave} onOpenChange={setConfirmSave} v={v} pending={save.isPending} onConfirm={() => { setConfirmSave(false); void doSave(); }} />
      <Tabs label="Editor views" tabs={TABS} value={tab} onChange={setTab} />
      <div key={tab} className="animate-enter">
        {tab === "steps" && <StepsEditor steps={working} onChange={setSteps} selected={selected} onSelect={setSelected} readOnly={!editable} />}
        {tab === "branches" && <BranchGraph steps={working} />}
        {tab === "diff" && <DiffView versionId={v.id} againstId={approved?.id ?? null} againstLabel={approved ? `v${approved.n}` : ""} />}
        {tab === "simulate" && <Simulate v={v} steps={working} />}
      </div>
    </div>
  );
}

/** Dry run: pick an answer for each decision and see the path a technician would walk, before anyone signs. */
function Simulate({ v, steps }: { v: ProcedureVersion; steps: Step[] }) {
  const decisions = useMemo(() => steps.filter((s) => s.branches.length), [steps]);
  const [choices, setChoices] = useState<Record<string, string>>(() => Object.fromEntries(decisions.map((d) => [d.key, d.branches[0].label])));
  const run = useDryRun();
  const [result, setResult] = useState<DryRun | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        {decisions.length ? decisions.map((d) => (
          <div key={d.key} className="flex flex-col gap-2">
            <span className="text-body font-medium">Step {d.n} · {d.title}</span>
            <Segmented label={d.title} options={d.branches.map((b) => ({ value: b.label, label: b.label }))} value={choices[d.key]} onChange={(x) => setChoices((c) => ({ ...c, [d.key]: x }))} />
          </div>
        )) : <p className="text-body text-muted">No decisions: there is one path.</p>}
        <Button variant="primary" disabled={run.isPending} onClick={() => run.mutate({ versionId: v.id, choices }, { onSuccess: setResult })}><Play />Run it</Button>
        {result && (
          <div className="flex flex-col gap-2" role="status">
            <p className="text-body">Walks {result.path.length} of {steps.length} steps, about {steps.filter((s) => result.path.includes(s.key)).reduce((n, s) => n + s.minutes, 0)} min.</p>
            <ul className="list-disc pl-5 text-small text-muted">{result.notes.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        )}
      </div>
      <BranchGraph steps={steps} highlight={result?.path} />
    </div>
  );
}

/** Import a manual PDF: the engine drafts steps with their page citations; a person edits and signs them. */
function ImportSheet({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [file, setFile] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Import a PDF" description="Araxos reads it on the plant server and drafts steps that cite their pages.">
      <div className="flex flex-col gap-4 px-5 py-4">
        <Field label="Manual or work instruction" help="PDF up to 200 pages.">{(f) => <Input {...fieldProps(f)} type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} />}</Field>
        <Button variant="primary" disabled={busy} onClick={() => { setBusy(true); window.setTimeout(() => { setBusy(false); toast.success("Draft ready", { description: `${file || "Mixer manual M-40.pdf"}: 6 steps with citations. Review every one.` }); onDone(); }, 900); }}>
          {busy ? "Reading…" : "Draft the steps"}
        </Button>
      </div>
    </Sheet>
  );
}

const SIGNATURE_ROLE: Record<ProcedureVersion["signatures"][number]["role"], string> = { engineering: "engineering", safety: "safety" };

/** Editing a version in review is allowed, but it changes the hash: say exactly which signatures stop counting. */
function ConfirmEditInReview({ open, onOpenChange, v, pending, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; v: ProcedureVersion; pending: boolean; onConfirm: () => void;
}) {
  const n = v.signatures.length;
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Save changes to v${v.n} in review?`}>
      <div className="flex flex-col gap-4 px-5 pt-3 pb-5 text-body">
        <p>Saving changes the signed text, so v{v.n} goes back to draft{n ? " and these signatures are invalidated:" : ". It has no signatures yet."}</p>
        {n > 0 && (
          <ul className="flex flex-col gap-1 rounded-card border border-border px-4 py-3">
            {v.signatures.map((s) => <li key={`${s.role}-${s.userId}`}><span className="font-medium">{s.name}</span> <span className="text-muted">· {SIGNATURE_ROLE[s.role]} · {fmtTime(s.at)}</span></li>)}
          </ul>
        )}
        <p className="text-muted">You will have to send it to review again, and {n ? "they will have to sign the new text again" : "every signature starts from zero"}.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Keep editing</Button>
          <Button variant="danger" disabled={pending} onClick={onConfirm} data-main-action>
            {n ? `Save and invalidate ${n === 1 ? "1 signature" : `${n} signatures`}` : "Save and return to draft"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
