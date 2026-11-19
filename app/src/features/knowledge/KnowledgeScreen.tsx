"use client";
import { Bot } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useActOnKnowledge, useKnowledge, useProcedures } from "@/features/hooks";
import type { KnowledgeItem, KnowledgeStatus } from "@/lib/api/types";
import { fmtAgo } from "@/lib/format";
import { useEnter } from "@/lib/gsapIn";
import { knowledgeKindLabel, knowledgeStatusLabel } from "@/lib/labels";
import { Button, HoldButton, Textarea } from "@/ui/atoms";
import { EmptyState, ErrorState, KeyValues, LoadingRows, PageHeader, Segmented } from "@/ui/cells";
import { Canvas, SplitLayout } from "@/ui/templates/ShellLayout";

const STATUS_OPTIONS = (Object.keys(knowledgeStatusLabel) as KnowledgeStatus[]).map((value) => ({
  value, label: knowledgeStatusLabel[value],
}));

export function KnowledgeScreen() {
  const knowledge = useKnowledge();
  const procedures = useProcedures();
  const [status, setStatus] = useState<KnowledgeStatus>("captured");
  const [selected, setSelected] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useEnter(root);

  const rows = useMemo(
    () => (knowledge.data ?? []).filter((k) => k.status === status),
    [knowledge.data, status],
  );
  const item = rows.find((k) => k.id === selected) ?? rows[0] ?? null;

  return (
    <div ref={root} className="flex min-h-0 flex-1 flex-col">
      <Canvas className="flex-none !pb-4">
        <PageHeader
          title="Saber"
          subline="Captures from the floor waiting for engineering to take into a draft, ask for more, or leave aside."
        />
        <div className="mt-5">
          <Segmented label="Status" options={STATUS_OPTIONS} value={status} onChange={(v) => { setStatus(v); setSelected(null); }} />
        </div>
      </Canvas>
      {knowledge.isPending ? <Canvas><LoadingRows rows={8} pitch="h-14" /></Canvas>
        : knowledge.isError ? <Canvas><ErrorState what="Saber" onRetry={() => knowledge.refetch()} /></Canvas>
          : (
            <SplitLayout
              list={(
                <KnowledgeList
                  rows={rows}
                  selected={item?.id ?? null}
                  onSelect={setSelected}
                />
              )}
              detail={(
                <KnowledgeDetail
                  item={item}
                  procedureLabel={item?.procedureId
                    ? procedures.data?.find((p) => p.id === item.procedureId)?.code ?? item.procedureId
                    : null}
                />
              )}
            />
          )}
    </div>
  );
}

function KnowledgeList({ rows, selected, onSelect }: {
  rows: KnowledgeItem[]; selected: string | null; onSelect: (id: string) => void;
}) {
  if (!rows.length) return <div className="p-4"><EmptyState>No items in this status.</EmptyState></div>;
  return (
    <ul role="listbox" aria-label="Saber items" className="flex flex-col divide-y divide-rule overflow-y-auto">
      {rows.map((k) => (
        <li key={k.id} role="option" aria-selected={selected === k.id}>
          <button
            type="button"
            onClick={() => onSelect(k.id)}
            className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors duration-[var(--dur-1)] hover:bg-raised focus-visible:bg-raised focus-visible:outline-none ${selected === k.id ? "bg-raised" : ""}`}
          >
            <span className="flex items-center gap-2 text-small text-muted">
              {k.authorKind === "mcp" && <Bot className="size-3.5" aria-hidden />}
              <span>{knowledgeKindLabel[k.kind]} · {fmtAgo(k.at)}</span>
            </span>
            <span className="line-clamp-2 text-body">{k.text}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function KnowledgeDetail({ item, procedureLabel }: { item: KnowledgeItem | null; procedureLabel: string | null }) {
  if (!item) return <div className="p-6"><EmptyState>Select a capture to review it.</EmptyState></div>;
  const author = item.authorKind === "mcp"
    ? <span className="inline-flex items-center gap-1.5"><Bot className="size-3.5 text-muted" aria-hidden />Proposed by an MCP client</span>
    : item.author;
  return (
    <div className="flex flex-col gap-6 p-6 md:px-8">
      <div>
        <p className="text-small text-muted">{knowledgeKindLabel[item.kind]} · {knowledgeStatusLabel[item.status]}</p>
        <p className="mt-2 text-section font-medium">{item.text}</p>
      </div>
      {item.transcript && (
        <blockquote className="rounded-control bg-raised px-4 py-3 text-body text-muted">
          {item.transcript}
        </blockquote>
      )}
      <KeyValues rows={[
        { k: "Author", v: author },
        { k: "Case", v: item.caseId
          ? <Link href={`/cases?id=${item.caseId}`} className="text-text underline-offset-4 hover:underline">Open case</Link>
          : <span className="text-muted">None</span> },
        { k: "Procedure", v: procedureLabel ?? <span className="text-muted">None</span> },
        { k: "Step", v: item.stepKey ?? <span className="text-muted">None</span> },
        ...(item.reason ? [{ k: "Reason", v: item.reason }] : []),
        ...(item.incorporatedIn ? [{ k: "Taken into", v: item.incorporatedIn }] : []),
      ]} />
      {(item.status === "captured" || item.status === "in_review" || item.status === "clarify") && (
        <KnowledgeActions item={item} />
      )}
    </div>
  );
}

function KnowledgeActions({ item }: { item: KnowledgeItem }) {
  const act = useActOnKnowledge();
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"clarify" | "reject" | null>(null);
  const run = (action: "incorporate" | "clarify" | "reject", why: string, ok: string) =>
    act.mutateAsync({ id: item.id, action, reason: why }).then(() => {
      toast.success(ok);
      setMode(null);
      setReason("");
    });

  return (
    <div className="flex flex-col gap-4 border-t border-rule pt-5">
      <HoldButton
        variant="primary"
        doneLabel="Incorporated"
        onConfirm={() => run("incorporate", "", "Incorporated into a draft")}
      >
        Incorporate into a draft
      </HoldButton>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setMode("clarify")}>Ask to clarify</Button>
        <Button variant="outline" onClick={() => setMode("reject")}>Not taken</Button>
      </div>
      {mode && (
        <div className="flex flex-col gap-3">
          <Textarea
            aria-label="Reason"
            rows={3}
            placeholder={mode === "clarify" ? "What should they clarify?" : "Why is this not taken?"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            variant="primary"
            disabled={!reason.trim() || act.isPending}
            onClick={() => run(
              mode,
              reason.trim(),
              mode === "clarify" ? "Asked to clarify" : "Marked as not taken",
            )}
          >
            {mode === "clarify" ? "Send clarification request" : "Confirm not taken"}
          </Button>
        </div>
      )}
    </div>
  );
}
