"use client";
import { useMemo, useRef, useState } from "react";
import { PLANT_ID, useAnalytics, useMachines, usePlants } from "@/features/hooks";
import type { Analytics, AnalyticsFilter, Distribution } from "@/lib/api/types";
import { fmtNum } from "@/lib/format";
import { useEnter, useGrow } from "@/lib/gsapIn";
import { Select } from "@/ui/atoms";
import { Card, DataTable, EmptyState, ErrorState, LoadingRows, PageHeader, Segmented } from "@/ui/cells";
import { Canvas } from "@/ui/templates/ShellLayout";

const PERIODS: { value: AnalyticsFilter["period"]; label: string }[] = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "365d", label: "12 months" },
];
const PCT = 100;

export function AnalyticsScreen() {
  const plants = usePlants();
  const machines = useMachines();
  const plant = plants.data?.find((p) => p.id === PLANT_ID);
  const kinds = useMemo(
    () => [...new Set((machines.data ?? []).map((m) => m.kind))].sort(),
    [machines.data],
  );
  const [filter, setFilter] = useState<AnalyticsFilter>({ area: "", kind: "", period: "30d" });
  const analytics = useAnalytics(filter);
  const root = useRef<HTMLDivElement>(null);
  useEnter(root);
  const set = (change: Partial<AnalyticsFilter>) => setFilter((f) => ({ ...f, ...change }));

  return (
    <Canvas>
      <div ref={root} className="flex flex-col gap-6">
        <PageHeader
          title="Analytics"
          subline="Aggregated plant KPIs only — never per person."
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-48">
            <Select aria-label="Area" value={filter.area} onChange={(e) => set({ area: e.target.value })}>
              <option value="">All areas</option>
              {(plant?.areas ?? []).map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </span>
          <span className="w-56">
            <Select aria-label="Machine kind" value={filter.kind} onChange={(e) => set({ kind: e.target.value })}>
              <option value="">All kinds</option>
              {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
            </Select>
          </span>
          <Segmented label="Period" options={PERIODS} value={filter.period} onChange={(period) => set({ period })} className="ml-auto" />
        </div>
        {analytics.isPending ? <LoadingRows rows={10} pitch="h-12" />
          : analytics.isError ? <ErrorState what="analytics" onRetry={() => analytics.refetch()} />
            : !analytics.data ? <EmptyState>No analytics for these filters.</EmptyState>
              : <AnalyticsBody data={analytics.data} />}
      </div>
    </Canvas>
  );
}

function AnalyticsBody({ data }: { data: Analytics }) {
  return (
    <div className="flex flex-col gap-6">
      <Card id="mttr-kind" title="MTTR by machine type" aside="Minutes · p25–p75, median, p90">
        {!data.mttrByKind.length ? <EmptyState>No MTTR data.</EmptyState> : <MttrDistribution rows={data.mttrByKind} />}
      </Card>
      <Card id="repeats" title="Repeat failures" aside="Same machine, same period">
        {!data.repeats.length ? <EmptyState>No repeats.</EmptyState> : (
          <DataTable label="Repeat failures" rows={data.repeats} rowKey={(r) => r.machine} columns={[
            { key: "m", label: "Machine", cell: (r) => <span className="font-medium num">{r.machine}</span> },
            { key: "c", label: "Cases", className: "text-right", cell: (r) => <span className="num">{fmtNum(r.count)}</span> },
            { key: "d", label: "Window", cell: (r) => <span className="text-muted">{r.days} days</span> },
          ]} />
        )}
      </Card>
      <Card id="coverage" title="Procedure coverage" aside="Machines with at least one approved procedure">
        {!data.coverage.length ? <EmptyState>No coverage data.</EmptyState> : (
          <DataTable label="Procedure coverage" rows={data.coverage} rowKey={(r) => r.kind} columns={[
            { key: "k", label: "Kind", cell: (r) => r.kind },
            { key: "c", label: "Covered", className: "text-right", cell: (r) => <span className="num">{r.covered}/{r.total}</span> },
            { key: "p", label: "Share", className: "text-right", cell: (r) => <span className="num">{Math.round((r.covered / Math.max(r.total, 1)) * PCT)} %</span> },
          ]} />
        )}
      </Card>
      <Card id="friction" title="Step friction" flush>
        {!data.friction.length ? <div className="px-5 py-4"><EmptyState>No friction data.</EmptyState></div> : (
          <DataTable label="Step friction" rows={data.friction} rowKey={(r) => `${r.procedure}-${r.version}-${r.step}`} minWidth={880} columns={[
            { key: "p", label: "Procedure", cell: (r) => <span className="num">{r.procedure} v{r.version}</span> },
            { key: "s", label: "Step", cell: (r) => r.step },
            { key: "f", label: "Fails", className: "text-right", cell: (r) => <span className="num">{fmtNum(r.fails)}</span> },
            { key: "k", label: "Skips", className: "text-right", cell: (r) => <span className="num">{fmtNum(r.skips)}</span> },
            { key: "m", label: "Median min", className: "text-right", cell: (r) => <span className="num">{fmtNum(r.minutes)}</span> },
          ]} />
        )}
      </Card>
      <Card id="effectiveness" title="Procedure effectiveness" aside="MTTR minutes before / after a new version">
        {!data.effectiveness.length ? <EmptyState>No effectiveness data.</EmptyState> : (
          <DataTable label="Procedure effectiveness" rows={data.effectiveness} rowKey={(r) => `${r.procedure}-${r.version}`} columns={[
            { key: "p", label: "Procedure", cell: (r) => <span className="num">{r.procedure} v{r.version}</span> },
            { key: "b", label: "Before", className: "text-right", cell: (r) => <span className="num">{fmtNum(r.before)}</span> },
            { key: "a", label: "After", className: "text-right", cell: (r) => <span className="num">{fmtNum(r.after)}</span> },
            { key: "d", label: "Change", className: "text-right", cell: (r) => <span className="num">{fmtNum(r.after - r.before)}</span> },
          ]} />
        )}
      </Card>
      <Card id="saber" title="Saber captured vs accepted" aside="Per week">
        {!data.knowledge.length ? <EmptyState>No Saber activity.</EmptyState> : <SaberWeeks rows={data.knowledge} />}
      </Card>
    </div>
  );
}

function MttrDistribution({ rows }: { rows: Distribution[] }) {
  const max = Math.max(...rows.map((r) => r.p90), 1);
  const list = useRef<HTMLUListElement>(null);
  useGrow(list, { selector: "[data-barx]", axis: "x" });
  return (
    <ul ref={list} className="flex flex-col gap-4">
      {rows.map((r) => (
        <li key={r.kind} className="grid grid-cols-[140px_1fr_72px] items-center gap-3 text-body">
          <span className="truncate">{r.kind}</span>
          <DistBar row={r} max={max} />
          <span className="text-right text-small text-muted num">{fmtNum(r.cases)} cases</span>
        </li>
      ))}
    </ul>
  );
}

function DistBar({ row, max }: { row: Distribution; max: number }) {
  const left = (row.p25 / max) * PCT;
  const width = ((row.p75 - row.p25) / max) * PCT;
  const median = (row.median / max) * PCT;
  const p90 = (row.p90 / max) * PCT;
  return (
    <div className="relative h-3 rounded-full bg-raised" role="img" aria-label={`p25 ${row.p25}, median ${row.median}, p75 ${row.p75}, p90 ${row.p90} minutes`}>
      <div className="absolute top-1/2 h-px bg-faint" style={{ left: `${left}%`, width: `${Math.max(0, p90 - left)}%` }} />
      <div
        data-barx
        className="absolute top-0 h-full origin-left rounded-full bg-bar"
        style={{ left: `${left}%`, width: `${Math.max(2, width)}%` }}
      />
      <div className="absolute top-[-2px] h-[calc(100%+4px)] w-0.5 bg-text" style={{ left: `${median}%` }} />
      <div className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-faint" style={{ left: `calc(${p90}% - 3px)` }} />
    </div>
  );
}

function SaberWeeks({ rows }: { rows: { week: string; captured: number; accepted: number }[] }) {
  const max = Math.max(...rows.map((r) => Math.max(r.captured, r.accepted)), 1);
  const list = useRef<HTMLUListElement>(null);
  useGrow(list, { selector: "[data-barx]", axis: "y" });
  return (
    <ul ref={list} className="grid grid-cols-5 gap-4">
      {rows.map((r) => (
        <li key={r.week} className="flex flex-col items-center gap-2">
          <div className="flex h-28 w-full items-end justify-center gap-1">
            <span data-barx className="w-3 origin-bottom rounded-sm bg-bar" style={{ height: `${(r.captured / max) * PCT}%` }} title={`Captured ${r.captured}`} />
            <span data-barx className="w-3 origin-bottom rounded-sm bg-accent" style={{ height: `${(r.accepted / max) * PCT}%` }} title={`Accepted ${r.accepted}`} />
          </div>
          <span className="text-small text-muted">{r.week}</span>
          <span className="text-small num">{r.captured}/{r.accepted}</span>
        </li>
      ))}
    </ul>
  );
}
