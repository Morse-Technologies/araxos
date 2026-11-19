"use client";
import { Bot, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useDecideMcp, useMcpProposals, useMcpTokens } from "@/features/hooks";
import { fmtAgo, fmtDate } from "@/lib/format";
import { Button, HoldButton, Pill } from "@/ui/atoms";
import { DataTable, EmptyState, ErrorState, LoadingRows } from "@/ui/cells";

/**
 * MCP clients read and propose; a person decides (§22.1, ADR-A37). No token, scope or model can approve,
 * sign or verify a safety step, so this screen never offers it.
 */
export function McpPanel() {
  const tokens = useMcpTokens();
  const proposals = useMcpProposals();
  const decide = useDecideMcp();
  if (tokens.isPending) return <LoadingRows rows={5} />;
  if (tokens.isError) return <ErrorState what="MCP tokens" onRetry={() => tokens.refetch()} />;
  const pending = proposals.data?.filter((p) => p.status === "pending") ?? [];
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-section font-medium">Waiting for a person</h2>
        {!pending.length ? <EmptyState>No MCP proposals are waiting.</EmptyState> : (
          <ul className="flex flex-col divide-y divide-rule rounded-card border border-border">
            {pending.map((p) => {
              const t = tokens.data.find((x) => x.id === p.tokenId);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                  <Bot className="size-4 text-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-body">{p.summary}</p>
                    <p className="text-small text-muted"><code className="font-mono">{p.tool}</code> · {t?.client} · {fmtAgo(p.at)}</p>
                  </div>
                  <Button variant="ghost" onClick={() => decide.mutate({ id: p.id, approve: false }, { onSuccess: () => toast("Proposal declined") })}>Decline</Button>
                  <HoldButton variant="primary" doneLabel="Approved" onConfirm={() => decide.mutateAsync({ id: p.id, approve: true }).then(() => toast.success("Proposal approved", { description: "It enters the normal flow as yours." }))}>Hold to approve</HoldButton>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-section font-medium">Tokens</h2>
        <DataTable label="MCP tokens" rows={tokens.data} rowKey={(t) => t.id} minWidth={900} columns={[
          { key: "n", label: "Client", cell: (t) => <span><span className="block font-medium">{t.client}</span><span className="text-small text-muted">{t.name}</span></span> },
          { key: "s", label: "Scopes", cell: (t) => <span className="flex flex-wrap gap-1">{t.scopes.map((s) => <Pill key={s}>{s}</Pill>)}</span> },
          { key: "a", label: "Area", cell: (t) => <span className="text-muted">{t.area ?? "Whole plant"}</span> },
          { key: "m", label: "Model", cell: (t) => (t.externalModel
            ? <span className="inline-flex items-center gap-1.5 text-[var(--pill-warning-ink)]"><TriangleAlert className="size-3.5" aria-hidden />External</span>
            : <span className="text-muted">On site</span>) },
          { key: "u", label: "Use", cell: (t) => <span className="text-muted num">{t.calls24h} calls today · {fmtAgo(t.lastUsedAt)}</span> },
          { key: "e", label: "Expires", cell: (t) => <span className="text-muted">{fmtDate(t.expiresAt)}</span> },
        ]} />
      </section>
    </div>
  );
}
