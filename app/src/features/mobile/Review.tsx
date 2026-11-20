"use client";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Entity } from "@/lib/api";
import { noteNo, when } from "@/lib/format";
import { useSharedTarget } from "@/lib/gsapIn";
import { t } from "@/lib/i18n";
import { Button, Skeleton, StatePill } from "@/ui/atoms";
import { Glass } from "@/ui/glass";
import { useAnswer, useCorrect, useNote, useResolveConflict } from "@/features/hooks";
import { ActionCard } from "@/features/queue/ActionCard";
import { Alternatives } from "@/features/queue/Alternatives";
import { Transcript, type Highlight } from "@/features/queue/Transcript";

/** In-frame bottom sheet (stays inside the phone frame on desktop). */
function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-end" role="dialog" aria-modal="true" aria-label={t.mobile.alternatives}>
      <button type="button" aria-label={t.common.close} className="absolute inset-0 bg-[var(--scrim)]" onClick={onClose} />
      <Glass tone="strong" float refract={{ radius: 32, bezel: 16, scale: -30 }} className="sq sq-xl relative m-2 w-full p-4 pb-6">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-control" aria-hidden />
        {children}
      </Glass>
    </div>
  );
}

export function ReviewScreen({ id }: { id: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: note } = useNote(id);
  const [highlight, setHighlight] = useState<Highlight>({});
  const [picked, setPicked] = useState<Entity | null>(null);
  const correct = useCorrect(id);
  const answer = useAnswer(id);
  const fix = useResolveConflict();
  const title = useRef<HTMLHeadingElement>(null);
  useSharedTarget(title, `m-note-${id}`);
  const done = () => { void qc.invalidateQueries(); router.push("/m/history"); };
  const submit = useMutation({ mutationFn: () => api.submit(id), onSuccess: () => { toast.success(t.mobile.sent); done(); }, onError: (e) => toast.error(e.message) });
  const discard = useMutation({ mutationFn: () => api.discard(id), onSuccess: done });
  if (!note) return <div className="p-5 pt-14"><Skeleton className="h-40" /></div>;
  const draft = note.state === "draft";
  return (
    <div className="px-4 pt-14 pb-40" data-testid="m-review">
      <header className="mb-4 flex items-start gap-3 px-1">
        <Link href="/m/history" aria-label="Volver" className="glass glass-clear grid size-10 shrink-0 place-items-center rounded-full"><ArrowLeft className="size-5" /></Link>
        <div className="min-w-0">
          <h1 ref={title} data-flip-id={`m-note-${id}`} className="text-title font-semibold tracking-tight text-balance">{note.customer}</h1>
          <p className="text-small text-muted"><span className="font-mono">{noteNo(note.number)}</span> · {when(note.recordedAt)}</p>
        </div>
        <span className="ml-auto shrink-0"><StatePill state={note.state} /></span>
      </header>
      {draft && <p className="mb-3 px-1 text-section font-semibold">{t.mobile.review}</p>}
      <Glass tone="strong" className="sq sq-xl p-4">
        <Transcript note={note} highlight={highlight} onHover={setHighlight} onPick={setPicked} picked={picked?.id} size="lg" />
        <p className="mt-3 text-small text-muted">{t.mobile.tapEntity}</p>
      </Glass>
      <div className="mt-4 space-y-3">
        {note.actions.map((a) => (
          <ActionCard key={a.id} note={note} action={a} highlight={highlight} onHover={setHighlight} busy={answer.isPending || fix.isPending}
            onEdit={(key, value) => correct.mutate({ kind: "field", actionId: a.id, key, value })}
            onAnswer={(optionId) => answer.mutate({ actionId: a.id, optionId })} onFix={() => fix.mutate(a.id)} />
        ))}
      </div>
      {draft && (
        <div className="absolute inset-x-0 bottom-0 z-10 flex gap-2 bg-gradient-to-t from-[var(--ground)] via-[var(--ground)]/80 to-transparent px-4 pt-8 pb-6">
          <Button variant="glass" size="lg" className="h-14" onClick={() => discard.mutate()} busy={discard.isPending} aria-label={t.mobile.discard}><Trash2 /></Button>
          <Button variant="primary" size="lg" className="h-14 flex-1" onClick={() => submit.mutate()} busy={submit.isPending} data-testid="send"><Send />{t.mobile.send}</Button>
        </div>
      )}
      {picked && (
        <Sheet onClose={() => setPicked(null)}>
          <p className="mb-1 text-section font-semibold">{t.mobile.alternatives}</p>
          <Alternatives key={picked.id} entity={note.entities.find((e) => e.id === picked.id) ?? picked} author="Javier" busy={correct.isPending} onClose={() => setPicked(null)}
            onChoose={(candidateId, rememberAlias) => correct.mutate({ kind: "entity", entityId: picked.id, candidateId, rememberAlias }, { onSuccess: () => setPicked(null) })} />
        </Sheet>
      )}
    </div>
  );
}
