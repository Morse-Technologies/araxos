"use client";
import { CheckCircle2, MessageSquare, Undo2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { showProblem, useLookups, versionIdOf } from "@/features/cases/shared";
import { DiffView } from "@/features/studio/DiffView";
import { useComment, useMe, useProcedures, useReturnDraft, useVersion, useVersionsOf } from "@/features/hooks";
import type { Me, Procedure, ProcedureVersion, SignatureRole } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { fmtAgo, fmtDate, fmtTime } from "@/lib/format";
import { Avatar, Button, Select, Textarea } from "@/ui/atoms";
import { EmptyState, ErrorState, Field, fieldProps, LoadingRows, Modal, SafetyTag, VersionPill } from "@/ui/cells";
import { SplitLayout } from "@/ui/templates/ShellLayout";
import { SignModal } from "./SignModal";

const SLOTS: { role: SignatureRole; label: string; needs: "engineer" | "safety_approver" }[] = [
  { role: "engineering", label: "Engineering", needs: "engineer" }, { role: "safety", label: "Safety", needs: "safety_approver" },
];

/** E3: versions waiting for signatures. A safety version needs an engineer and a safety approver, two different people, on the same hash. */
export function ReviewScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const procs = useProcedures();
  const waiting = (procs.data ?? []).filter((p) => p.draft).map((p) => ({ p, vid: versionIdOf(p, p.draft)! }));
  const vid = params.get("v") ?? waiting[0]?.vid ?? null;
  const p = procs.data?.find((x) => vid && x.versions.includes(vid));
  return (
    <SplitLayout
      list={(
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-rule p-4"><h1 className="text-section font-medium">Review</h1><p className="text-small text-muted">Open versions of every procedure</p></div>
          {procs.isPending ? <LoadingRows rows={4} pitch="h-16" className="p-4" /> : !waiting.length ? <EmptyState className="m-4">Nothing is waiting for review.</EmptyState> : (
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {waiting.map(({ p: x, vid: id }) => <QueueRow key={id} p={x} vid={id} active={id === vid} onClick={() => router.replace(`/review?v=${id}`, { scroll: false })} />)}
            </ul>
          )}
        </div>
      )}
      detail={vid && p ? <Detail key={vid} p={p} vid={vid} /> : <EmptyState className="m-8">Pick a version.</EmptyState>}
    />
  );
}

function QueueRow({ p, vid, active, onClick }: { p: Procedure; vid: string; active: boolean; onClick: () => void }) {
  const { data: v } = useVersion(vid);
  const need = v?.status === "safety_review" ? 2 : 1;
  return (
    <li>
      <button type="button" onClick={onClick} aria-current={active ? "true" : undefined} className={cn("flex w-full flex-col gap-1 border-b border-rule px-4 py-3 text-left hover:bg-raised", active && "bg-surface")}>
        <span className="flex items-center gap-2 text-small text-muted"><span className="font-mono">{p.code} v{p.draft}</span>{v && <span className="ml-auto"><VersionPill status={v.status} /></span>}</span>
        <span className="text-body">{p.title}</span>
        {v && v.status !== "draft" && <span className="text-small text-muted num">{v.signatures.length} of {need} signatures</span>}
      </button>
    </li>
  );
}

/** Why this person cannot give this signature, or null when they can. The server repeats every check. */
function blocker(v: ProcedureVersion, me: Me, needs: "engineer" | "safety_approver"): string | null {
  if (!me.roles.includes(needs)) return `Needs ${needs === "engineer" ? "an engineer" : "a safety approver"}.`;
  if (v.lastEditorId === me.id) return "You made the last change, so you cannot sign it.";
  if (v.signatures.some((s) => s.userId === me.id)) return "You gave the other signature; this one has to be another person.";
  return null;
}

function Detail({ p, vid }: { p: Procedure; vid: string }) {
  const { data: v, isPending, isError, refetch } = useVersion(vid);
  const versions = useVersionsOf(p.id);
  const { data: me } = useMe();
  const look = useLookups();
  const [signing, setSigning] = useState<SignatureRole | null>(null);
  const [returning, setReturning] = useState(false);
  if (isPending || !me) return <LoadingRows rows={8} className="p-8" />;
  if (isError || !v) return <ErrorState what="this version" onRetry={() => refetch()} className="m-8" />;
  const approved = versions.data?.find((x) => x.status === "approved" && x.id !== v.id);
  const slots = v.status === "safety_review" || v.steps.some((s) => s.kind === "safety") ? SLOTS : SLOTS.slice(0, 1);
  const label = `${p.code} v${v.n}`;
  const inReview = v.status === "review" || v.status === "safety_review";

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-6 px-4 py-6 md:px-8 animate-enter">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-small text-muted"><span className="font-mono">{label}</span> · {p.machineKind} {v.steps.some((s) => s.kind === "safety") && <SafetyTag />}</p>
          <h2 className="mt-1 text-title font-medium tracking-[-0.01em]">{p.title}</h2>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-small text-muted"><VersionPill status={v.status} /><span>by {look.person(v.authorId)?.name}, last change by {look.person(v.lastEditorId)?.name} {fmtAgo(v.createdAt)}</span></p>
          {v.changeNote && <p className="mt-2 text-body">{v.changeNote}</p>}
        </div>
        {inReview && <Button variant="ghost" onClick={() => setReturning(true)}><Undo2 />Return to draft</Button>}
      </header>

      <section aria-label="Signatures" className="flex flex-col gap-3">
        <h3 className="flex items-baseline justify-between text-section font-medium">Signatures<span className="text-small font-normal text-muted num">{v.signatures.length} of {slots.length}</span></h3>
        <p className="text-small text-muted">Every signature is on sha256 <code className="font-mono">{v.bodySha256.slice(0, 16)}…</code>. Editing the text clears them.</p>
        <div className={cn("grid gap-3", slots.length > 1 && "sm:grid-cols-2")}>
          {slots.map((slot) => {
            const s = v.signatures.find((x) => x.role === slot.role);
            const why = blocker(v, me, slot.needs);
            return (
              <div key={slot.role} className="flex flex-col gap-3 rounded-card border border-border p-4">
                <p className="text-body font-medium">{slot.label} signature</p>
                {s ? (
                  <p className="flex items-center gap-2 text-body"><CheckCircle2 className="size-4 text-positive" aria-hidden /><Avatar name={s.name} size={20} />{s.name}<span className="ml-auto text-small text-muted">{fmtDate(s.at)} {fmtTime(s.at)}</span></p>
                ) : !inReview ? <p className="text-body text-muted">Send the draft to review first.</p>
                  : why ? <p className="text-body text-muted">{why}</p>
                    : <Button variant="primary" onClick={() => setSigning(slot.role)}>Sign as {slot.needs === "engineer" ? "engineer" : "safety approver"}</Button>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-section font-medium">What changed</h3>
        <DiffView versionId={v.id} againstId={approved?.id ?? null} againstLabel={approved ? `v${approved.n}, the version in use` : ""} />
      </section>

      <Comments v={v} />
      {signing && <SignModal open onOpenChange={(o) => { if (!o) setSigning(null); }} v={v} role={signing} me={me} label={label} />}
      <ReturnModal open={returning} onOpenChange={setReturning} versionId={v.id} />
    </div>
  );
}

function Comments({ v }: { v: ProcedureVersion }) {
  const comment = useComment();
  const [step, setStep] = useState(v.steps[0]?.key ?? "");
  const [text, setText] = useState("");
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-section font-medium"><MessageSquare className="size-4" aria-hidden />Comments</h3>
      {v.comments.length ? (
        <ul className="flex flex-col gap-2">
          {v.comments.map((c, i) => (
            <li key={i} className="rounded-card border border-border px-4 py-3">
              <p className="text-small text-muted">{c.author} · {c.stepKey ? `step ${v.steps.find((s) => s.key === c.stepKey)?.n}` : "whole version"} · {fmtAgo(c.at)}</p>
              <p className="text-body">{c.text}</p>
            </li>
          ))}
        </ul>
      ) : <p className="text-body text-muted">No comments yet.</p>}
      <div className="flex flex-wrap items-end gap-2">
        <Select aria-label="Step" value={step} onChange={(e) => setStep(e.target.value)} className="w-48">{v.steps.map((s) => <option key={s.key} value={s.key}>Step {s.n} · {s.title}</option>)}</Select>
        <Textarea aria-label="Comment" rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="Comment on this step" className="min-w-64 flex-1" />
        <Button variant="outline" disabled={!text.trim()} onClick={() => comment.mutate({ versionId: v.id, stepKey: step, text: text.trim() }, { onSuccess: () => setText(""), onError: showProblem })}>Comment</Button>
      </div>
    </section>
  );
}

function ReturnModal({ open, onOpenChange, versionId }: { open: boolean; onOpenChange: (o: boolean) => void; versionId: string }) {
  const ret = useReturnDraft();
  const [reason, setReason] = useState("");
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Return to draft">
      <div className="flex flex-col gap-4 px-5 pt-3 pb-5">
        <Field label="What has to change?" help="The author sees this. Any signature already given is cleared.">{(f) => <Textarea {...fieldProps(f)} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
        <Button variant="primary" disabled={!reason.trim() || ret.isPending} onClick={() => ret.mutate({ versionId, reason: reason.trim() }, { onSuccess: () => { toast("Returned to draft"); onOpenChange(false); }, onError: showProblem })}>Return to draft</Button>
      </div>
    </Modal>
  );
}
