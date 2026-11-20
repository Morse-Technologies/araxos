"use client";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { euros, noteNo, when } from "@/lib/format";
import { useEnter } from "@/lib/gsapIn";
import { t } from "@/lib/i18n";
import { STAGGER } from "@/lib/motion";
import { Band, Button, Skeleton, StatePill } from "@/ui/atoms";
import { Glass } from "@/ui/glass";
import { LinkTabs } from "@/ui/tabs";
import { useAudit, useNotes, useUsers, userName } from "@/features/hooks";

const TABS = [{ href: "/history", label: t.history.notes }, { href: "/history/audit", label: t.history.audit }];

export function HistoryHeader() {
  return (
    <div className="mb-6 flex items-end justify-between px-1">
      <h1 className="text-display font-semibold tracking-tight">{t.history.title}</h1>
      <LinkTabs items={TABS} label={t.history.title} />
    </div>
  );
}

export function ClosedNotes() {
  const { data } = useNotes();
  const { data: users } = useUsers();
  const list = useRef<HTMLUListElement>(null);
  const closed = (data ?? []).filter((n) => n.state === "applied" || n.state === "rejected" || n.state === "awaiting_second");
  useEnter(list, { stagger: STAGGER.rows });
  return (
    <>
      <HistoryHeader />
      <Glass tone="strong" className="sq sq-lg p-2">
        {!data && <Skeleton className="m-3 h-40" />}
        {data && closed.length === 0 && <p className="p-10 text-center text-muted">{t.history.empty}</p>}
        <ul ref={list} className="divide-y divide-[var(--rule)]">
          {closed.map((n) => (
            <li key={n.id} className="grid grid-cols-[110px_minmax(0,1.2fr)_minmax(0,2fr)_auto_auto] items-center gap-4 px-4 py-3.5">
              <span className="font-mono text-small text-muted tabular">{noteNo(n.number)}</span>
              <span className="min-w-0"><span className="block truncate font-medium">{n.customer}</span><span className="text-small text-muted">{userName(users, n.authorId)} · {when(n.recordedAt)}</span></span>
              <span className="flex min-w-0 items-center gap-3"><span className="truncate text-muted">{n.summary}</span>{n.kinds.map((k) => <Band key={k} kind={k} />)}</span>
              <span className="text-small tabular">{n.total ? euros(n.total) : ""}</span>
              <StatePill state={n.state} />
            </li>
          ))}
        </ul>
      </Glass>
    </>
  );
}

export function AuditLog() {
  const { data } = useAudit();
  const { data: users } = useUsers();
  const verify = useMutation({ mutationFn: api.verifyAudit });
  return (
    <>
      <HistoryHeader />
      <div className="mb-4 flex items-center gap-3 px-1">
        <Button onClick={() => verify.mutate()} busy={verify.isPending} data-testid="verify"><ShieldCheck />{t.history.verify}</Button>
        {verify.data && (
          <p className={verify.data.ok ? "flex items-center gap-1.5 font-medium text-positive" : "flex items-center gap-1.5 font-medium text-negative"} role="status">
            {verify.data.ok ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
            {verify.data.ok ? t.history.verified(verify.data.checked) : t.history.broken(verify.data.checked)}
          </p>
        )}
        <p className="ml-auto text-small text-muted">{t.history.chainNote}</p>
      </div>
      <Glass tone="strong" className="sq sq-lg overflow-hidden">
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-[var(--rule)] text-left text-small text-muted">
              {[t.history.cols.when, t.history.cols.who, t.history.cols.event, t.history.cols.subject, t.history.cols.detail, t.history.cols.hash].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((e) => (
              <tr key={e.seq} className="border-b border-[var(--rule)] last:border-0">
                <td className="px-4 py-2.5 whitespace-nowrap tabular text-muted">{when(e.at)}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">{userName(users, e.actorId)}</td>
                <td className="px-4 py-2.5 font-mono text-small">{e.type}</td>
                <td className="px-4 py-2.5 whitespace-nowrap font-mono text-small tabular">{e.subject}</td>
                <td className="max-w-[360px] truncate px-4 py-2.5 text-muted">{e.detail}</td>
                <td className="px-4 py-2.5 font-mono text-small text-muted" title={`prev ${e.prev}`}>{e.hash.slice(0, 10)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Glass>
    </>
  );
}
