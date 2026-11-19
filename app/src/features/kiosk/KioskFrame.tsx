"use client";
import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useTerminal } from "@/features/hooks";
import { fmtAgo, fmtTime } from "@/lib/format";
import { MOCK_NOW } from "@/lib/clock";
import { Mark } from "@/ui/atoms";

/** The shared terminal's frame: its name, the time and how fresh its data is (`AxSyncStrip`), nothing personal. */
export function KioskFrame({ terminalId, children }: { terminalId: string; children: ReactNode }) {
  const { data: t } = useTerminal(terminalId);
  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      <header className="flex items-center gap-4 px-6 py-4">
        <Mark className="size-7" />
        <span className="text-section font-medium">Araxos</span>
        <span className="text-body text-muted">{t ? `${t.name} · ${t.area}` : ""}</span>
        <span className="ml-auto text-section num">{fmtTime(new Date(MOCK_NOW).toISOString())}</span>
      </header>
      <main id="main" className="grid flex-1 place-items-center px-4 pb-10">
        <div className="w-full max-w-[640px] rounded-card border border-border bg-surface p-8 shadow-[var(--shadow-float)]">{children}</div>
      </main>
      <footer className="flex items-center gap-2 px-6 pb-4 text-small text-muted">
        <RefreshCw className="size-3.5" aria-hidden />{t ? `Synced ${fmtAgo(t.lastSyncAt)} · ${t.pendingOps} pending` : "Syncing"} · Mock data
      </footer>
    </div>
  );
}
