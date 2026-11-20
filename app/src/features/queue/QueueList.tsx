"use client";
import { AlertTriangle, CalendarClock, HelpCircle, PenLine } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { NoteSummary } from "@/lib/api";
import { cn } from "@/lib/cn";
import { euros, noteNo, time } from "@/lib/format";
import { captureShared, useEnter } from "@/lib/gsapIn";
import { t } from "@/lib/i18n";
import { STAGGER } from "@/lib/motion";
import { Band, Pill, Skeleton } from "@/ui/atoms";
import { Glass } from "@/ui/glass";
import { useQueue, useUsers, userName } from "@/features/hooks";

const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && !!e.target.closest("input, textarea, [contenteditable=true], [role=dialog]");

/** J/K move through the queue. */
function useQueueKeys(ids: string[], current?: string) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k !== "j" && k !== "k") return;
      const i = current ? ids.indexOf(current) : -1;
      const next = ids[k === "j" ? Math.min(i + 1, ids.length - 1) : Math.max(i - 1, 0)];
      if (next && next !== current) { captureShared(`note-${next}`); router.push(`/queue/${next}`); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ids, current, router]);
}

function Row({ n, selected }: { n: NoteSummary; selected: boolean }) {
  const { data: users } = useUsers();
  const double = (n.total ?? 0) > 3000;
  return (
    <li data-row={n.id} className="overflow-hidden">
      <Link href={`/queue/${n.id}`} onClick={() => captureShared(`note-${n.id}`)} aria-current={selected ? "true" : undefined}
        className={cn("sq sq-md group relative block px-4 py-3.5 transition-colors hover:bg-[var(--pill-neutral-bg)]", selected && "bg-accent-soft hover:bg-accent-soft")}>
        {selected && <span aria-hidden className="absolute top-4 bottom-4 left-0 w-[3px] rounded-full bg-accent" />}
        <div className="flex items-baseline gap-2">
          <span data-flip-id={`note-${n.id}`} className="truncate text-section font-medium">{n.customer}</span>
          <span className="ml-auto shrink-0 font-mono text-small text-muted tabular">{noteNo(n.number)}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-small text-muted">
          <span>{userName(users, n.authorId)}</span><span aria-hidden>·</span><span>{n.place}</span><span aria-hidden>·</span><span className="tabular">{time(n.recordedAt)}</span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-body text-text/85">{n.summary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {n.kinds.map((k) => <Band key={k} kind={k} />)}
          <span className="ml-auto flex items-center gap-1.5">
            {n.urgent && <Pill tone="negative"><AlertTriangle />Urgente</Pill>}
            {n.openQuestions > 0 && <Pill tone="warning"><HelpCircle />{t.queue.questions(n.openQuestions)}</Pill>}
            {n.conflicts > 0 && <Pill tone="warning"><CalendarClock />{t.queue.conflicts}</Pill>}
            {n.state === "awaiting_second" ? <Pill tone="warning"><PenLine />1/2</Pill> : double && <Pill><PenLine />{t.queue.double}</Pill>}
            {n.total !== undefined && <span className="text-small font-medium tabular">{euros(n.total)}</span>}
          </span>
        </div>
      </Link>
    </li>
  );
}

export function QueueList() {
  const { data, isLoading } = useQueue();
  const params = useParams<{ id?: string }>();
  const list = useRef<HTMLDivElement>(null);
  const ids = (data ?? []).flatMap((g) => g.items.map((n) => n.id));
  useQueueKeys(ids, params.id);
  useEnter(list, { selector: "li", stagger: STAGGER.rows });
  const total = ids.length;
  return (
    <Glass tone="strong" className="sq sq-lg flex min-h-0 flex-col" aria-label={t.queue.title}>
      <div className="flex items-baseline justify-between px-5 pt-5 pb-3">
        <h1 className="text-title font-semibold tracking-tight">{t.queue.title}</h1>
        <span className="text-small text-muted tabular" data-testid="queue-count">{t.queue.count(total)}</span>
      </div>
      <div ref={list} className="scroll-soft min-h-0 flex-1 overflow-y-auto px-2 pb-3" data-lenis-prevent>
        {isLoading && <div className="space-y-2 p-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>}
        {!isLoading && total === 0 && (
          <div className="px-4 py-16 text-center">
            <p className="text-section font-medium">{t.queue.empty}</p>
            <p className="mt-1 text-muted">{t.queue.emptyHint}</p>
          </div>
        )}
        {(data ?? []).map((g) => (
          <section key={g.key} aria-label={g.label} className="mb-2">
            <h2 className="px-4 pt-2 pb-1 text-small font-medium text-muted">{g.label}</h2>
            <ul className="space-y-0.5">{g.items.map((n) => <Row key={n.id} n={n} selected={n.id === params.id} />)}</ul>
          </section>
        ))}
      </div>
    </Glass>
  );
}
