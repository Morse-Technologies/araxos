"use client";
import { Car, ChevronRight, Mic } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { MOBILE_ACTOR, type NoteSummary } from "@/lib/api";
import { noteNo, when } from "@/lib/format";
import { captureShared, useEnter } from "@/lib/gsapIn";
import { t } from "@/lib/i18n";
import { STAGGER } from "@/lib/motion";
import { Band, Skeleton, StatePill } from "@/ui/atoms";
import { Glass } from "@/ui/glass";
import { useNotes } from "@/features/hooks";

export function NoteCard({ n }: { n: NoteSummary }) {
  return (
    <Link href={`/m/review/${n.id}`} onClick={() => captureShared(`m-note-${n.id}`)} className="block">
      <Glass tone="strong" className="sq sq-lg p-4 transition-transform active:scale-[0.98]" data-testid="m-note">
        <div className="flex items-center gap-2">
          <span data-flip-id={`m-note-${n.id}`} className="truncate text-section font-semibold">{n.customer}</span>
          <ChevronRight className="ml-auto size-4 shrink-0 text-muted" aria-hidden />
        </div>
        <p className="mt-0.5 text-small text-muted"><span className="font-mono">{noteNo(n.number)}</span> · {when(n.recordedAt)}</p>
        <p className="mt-2 line-clamp-2 text-body">{n.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">{n.kinds.map((k) => <Band key={k} kind={k} />)}<span className="ml-auto"><StatePill state={n.state} /></span></div>
      </Glass>
    </Link>
  );
}

export function MobileHome() {
  const { data } = useNotes({ author: MOBILE_ACTOR });
  const list = useRef<HTMLDivElement>(null);
  useEnter(list, { stagger: STAGGER.cards });
  return (
    <div ref={list} className="space-y-6 px-5 pt-14 pb-32">
      <header>
        <p className="text-small text-muted">{t.mobile.today} · {new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" }).format(new Date())}</p>
        <h1 className="text-display font-semibold tracking-tight">{t.mobile.hello("Javier")}</h1>
      </header>
      <Link href="/m/record" className="block" data-testid="m-record-card">
        <Glass float refract={{ radius: 32, bezel: 20, scale: -40 }} clip={32} className="sq sq-xl flex items-center gap-4 p-5">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-rec text-white shadow-[0_8px_24px_-6px_var(--rec)]"><Mic className="size-7" /></span>
          <span><span className="block text-section font-semibold">{t.mobile.record}</span><span className="text-small text-muted">{t.mobile.recordHint}</span></span>
        </Glass>
      </Link>
      <Link href="/m/car" className="glass glass-clear sq sq-lg flex items-center gap-3 px-4 py-3 font-medium"><Car className="size-5" />{t.mobile.car.title}<ChevronRight className="ml-auto size-4 text-muted" /></Link>
      <section className="space-y-3">
        <div className="flex items-baseline justify-between"><h2 className="text-section font-semibold">{t.mobile.recent}</h2><Link href="/m/history" className="text-small font-medium text-muted">{t.mobile.seeAll}</Link></div>
        {!data && <Skeleton className="h-28" />}
        {data?.slice(0, 3).map((n) => <NoteCard key={n.id} n={n} />)}
      </section>
    </div>
  );
}

export function MobileHistory() {
  const { data } = useNotes({ author: MOBILE_ACTOR });
  const list = useRef<HTMLDivElement>(null);
  useEnter(list, { stagger: STAGGER.cards });
  return (
    <div className="px-5 pt-14 pb-32">
      <h1 className="mb-5 text-display font-semibold tracking-tight">{t.mobile.historyTitle}</h1>
      <div ref={list} className="space-y-3">
        {!data && <Skeleton className="h-28" />}
        {data?.map((n) => <NoteCard key={n.id} n={n} />)}
      </div>
    </div>
  );
}
