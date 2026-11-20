"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Mic, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, noteTotal, setMockActor, CONSOLE_ACTOR, type Entity, type Note } from "@/lib/api";
import { cn } from "@/lib/cn";
import { noteNo, noteShort, when } from "@/lib/format";
import { slideAway, stamp, useEnter, useSharedTarget } from "@/lib/gsapIn";
import { t } from "@/lib/i18n";
import { STAGGER } from "@/lib/motion";
import { Avatar, Button, Skeleton, StatePill } from "@/ui/atoms";
import { Glass } from "@/ui/glass";
import { Modal } from "@/ui/overlay";
import { keys, useAnswer, useCorrect, useNote, useResolveConflict, useUsers, userName } from "@/features/hooks";
import { ActionCard } from "./ActionCard";
import { Alternatives } from "./Alternatives";
import { ChangeCard } from "./Changes";
import { Dock } from "./Dock";
import { Transcript, type Highlight } from "./Transcript";

const SECOND_SIGNER = { id: "u-rosa", name: "Rosa Méndez" };
const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && !!e.target.closest("input, textarea, [role=dialog]");

/** Approve, reject, undo and the second signature, with the row sliding out of the queue. */
function useDecisions(note: Note | undefined) {
  const qc = useQueryClient();
  const refresh = (n: Note) => {
    qc.setQueryData(keys.note(n.id), n);
    for (const k of [keys.queue, ["notes"], keys.audit]) void qc.invalidateQueries({ queryKey: k });
  };
  const row = () => document.querySelector(`[data-row="${note?.id}"]`);
  const undo = useMutation({ mutationFn: () => api.undo(note!.id), onSuccess: refresh, onError: (e) => toast.error(e.message) });
  const approve = useMutation({
    mutationFn: async (as?: string) => { if (as) setMockActor(as); try { return await api.approveAll(note!.id); } finally { if (as) setMockActor(CONSOLE_ACTOR); } },
    onSuccess: async (n) => {
      if (n.state === "applied") {
        await slideAway(row(), 1);
        toast.success(t.approve.applied(noteShort(n.number)), { action: { label: t.approve.undo, onClick: () => undo.mutate() } });
      } else toast(t.approve.firstSigned);
      refresh(n);
    },
    onError: (e) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: (reason: string) => api.reject(note!.id, reason),
    onSuccess: async (n) => {
      await slideAway(row(), -1);
      toast(t.approve.rejected(noteShort(n.number)), { action: { label: t.approve.undo, onClick: () => undo.mutate() } });
      refresh(n);
    },
    onError: (e) => toast.error(e.message),
  });
  return { approve, reject, undo, busy: approve.isPending || reject.isPending || undo.isPending };
}

function RejectDialog({ open, onOpenChange, onConfirm, busy }: { open: boolean; onOpenChange: (o: boolean) => void; onConfirm: (r: string) => void; busy: boolean }) {
  const [reason, setReason] = useState("");
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t.approve.rejectTitle}>
      <form className="space-y-3 px-6 pt-3 pb-5" onSubmit={(e) => { e.preventDefault(); if (reason.trim()) onConfirm(reason.trim()); }}>
        <label className="block text-small text-muted" htmlFor="reject-reason">{t.approve.rejectReason}</label>
        <textarea id="reject-reason" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={t.approve.rejectPlaceholder}
          className="sq sq-sm w-full resize-none bg-surface p-3 ring-1 ring-[var(--rule)] outline-none focus:ring-2 focus:ring-accent" />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t.detail.cancel}</Button>
          <Button type="submit" variant="primary" busy={busy} disabled={!reason.trim()}>{t.approve.reject}</Button>
        </div>
      </form>
    </Modal>
  );
}

function Header({ note }: { note: Note }) {
  const { data: users } = useUsers();
  const title = useRef<HTMLHeadingElement>(null);
  const seal = useRef<HTMLDivElement>(null);
  useSharedTarget(title, `note-${note.id}`);
  useEffect(() => { if (note.state === "applied") stamp(seal.current); }, [note.state]);
  const author = users?.find((u) => u.id === note.authorId);
  return (
    <header className="relative flex items-end gap-4 px-1 pb-5">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2 text-small text-muted">
          <span className="font-mono tabular">{noteNo(note.number)}</span><span aria-hidden>·</span><span className="tabular">{when(note.recordedAt)}</span>
        </div>
        <h2 ref={title} data-flip-id={`note-${note.id}`} className="text-display font-semibold tracking-tight">{note.customer}</h2>
        <p className="mt-1 text-section text-muted">{note.summary}</p>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <StatePill state={note.state} />
        {author && <span className="flex items-center gap-2 text-body"><Avatar initials={author.initials} />{author.name}</span>}
      </div>
      {note.state === "applied" && (
        <div ref={seal} data-testid="stamp" className="sq sq-sm pointer-events-none absolute top-0 right-1/3 -rotate-4 border-2 border-positive px-3 py-1 text-small font-semibold tracking-wide text-positive uppercase">
          {t.approve.stamp} · {userName(users, "u-carmen").split(" ")[0]}
        </div>
      )}
    </header>
  );
}

function SaidColumn({ note, highlight, setHighlight }: { note: Note; highlight: Highlight; setHighlight: (h: Highlight) => void }) {
  const [picked, setPicked] = useState<Entity | null>(null);
  const correct = useCorrect(note.id);
  const { data: users } = useUsers();
  const author = userName(users, note.authorId).split(" ")[0];
  return (
    <Glass tone="strong" className="sq sq-lg p-5" aria-label={t.detail.said}>
      <h3 className="mb-3 text-small font-medium text-muted">{t.detail.said}</h3>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-muted">
        <span className="flex items-center gap-1">{note.channel === "app" ? <Mic className="size-3.5" /> : <MessageCircle className="size-3.5" />}{t.channels[note.channel]}</span>
        <span className="tabular">{t.common.seconds(note.durationSec)}</span>
        <span>{note.langs.map((l) => t.langs[l]).join(" + ")}</span>
      </div>
      <Transcript note={note} highlight={highlight} onHover={setHighlight} onPick={setPicked} picked={picked?.id} />
      {picked && (
        <Alternatives key={picked.id} entity={note.entities.find((e) => e.id === picked.id) ?? picked} author={author} busy={correct.isPending} onClose={() => setPicked(null)}
          onChoose={(candidateId, rememberAlias) => correct.mutate({ kind: "entity", entityId: picked.id, candidateId, rememberAlias }, { onSuccess: () => setPicked(null) })} />
      )}
      <p className="mt-5 text-small text-muted">{t.detail.audioNote}</p>
    </Glass>
  );
}

function ProposedColumn({ note, highlight, setHighlight }: { note: Note; highlight: Highlight; setHighlight: (h: Highlight) => void }) {
  const answer = useAnswer(note.id);
  const correct = useCorrect(note.id);
  const fix = useResolveConflict();
  const list = useRef<HTMLDivElement>(null);
  useEnter(list, { stagger: STAGGER.cards });
  return (
    <Glass tone="strong" className="sq sq-lg p-5" aria-label={t.detail.proposed}>
      <h3 className="mb-3 text-small font-medium text-muted">{t.detail.proposed}</h3>
      <div ref={list} className="space-y-3">
        {note.actions.map((a) => (
          <ActionCard key={a.id} note={note} action={a} highlight={highlight} onHover={setHighlight} busy={answer.isPending || fix.isPending}
            onEdit={(key, value) => correct.mutate({ kind: "field", actionId: a.id, key, value })}
            onAnswer={(optionId) => answer.mutate({ actionId: a.id, optionId })}
            onFix={() => fix.mutate(a.id)} />
        ))}
      </div>
    </Glass>
  );
}

function ChangesColumn({ note }: { note: Note }) {
  return (
    <Glass tone="strong" className="sq sq-lg p-5" aria-label={t.detail.willChange}>
      <div className="mb-3 flex items-center">
        <h3 className="text-small font-medium text-muted">{t.detail.willChange}</h3>
        <Link href={`/queue/${note.id}/diff`} className="ml-auto flex items-center gap-1 text-small font-medium text-text hover:underline">{t.detail.fullDiff}<ArrowUpRight className="size-3.5" /></Link>
      </div>
      <div className="space-y-3">{note.actions.map((a) => <ChangeCard key={a.id} action={a} />)}</div>
    </Glass>
  );
}

/** The three-column review of one note: what was said, what is proposed, what will change. */
export function NoteDetail({ id }: { id: string }) {
  const { data: note, isLoading } = useNote(id);
  const [highlight, setHighlight] = useState<Highlight>({});
  const [rejecting, setRejecting] = useState(false);
  const d = useDecisions(note);
  const { data: users } = useUsers();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!note || typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const open = note.state !== "applied" && note.state !== "rejected";
      if (k === "a" && open && note.state !== "awaiting_second") { e.preventDefault(); d.approve.mutate(undefined); }
      if (k === "r" && open) { e.preventDefault(); setRejecting(true); }
      if (k === "e" && open) { e.preventDefault(); (document.querySelector("[data-edit]:not(:disabled)") as HTMLButtonElement | null)?.click(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [note, d.approve]);
  if (isLoading || !note) return <div className="space-y-4"><Skeleton className="h-20" /><div className="grid grid-cols-3 gap-4"><Skeleton className="h-96" /><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>;
  return (
    <div data-testid="note-detail" data-state={note.state}>
      <Header note={note} />
      <div className={cn("grid items-start gap-4", "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)]")}>
        <SaidColumn note={note} highlight={highlight} setHighlight={setHighlight} />
        <ProposedColumn note={note} highlight={highlight} setHighlight={setHighlight} />
        <ChangesColumn note={note} />
      </div>
      <Dock note={note} total={noteTotal(note)} busy={d.busy} secondName={SECOND_SIGNER.name} firstSigner={note.approvals[0] ? userName(users, note.approvals[0].userId) : undefined}
        onApprove={() => d.approve.mutate(undefined)} onSignAs={() => d.approve.mutate(SECOND_SIGNER.id)}
        onReject={() => setRejecting(true)} onUndo={() => d.undo.mutate()} />
      <RejectDialog open={rejecting} onOpenChange={setRejecting} busy={d.reject.isPending} onConfirm={(r) => d.reject.mutate(r, { onSuccess: () => setRejecting(false) })} />
    </div>
  );
}
