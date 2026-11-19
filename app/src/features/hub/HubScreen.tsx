"use client";
import { CloudOff, TriangleAlert, Wifi } from "lucide-react";
import { useRef } from "react";
import { useGroupProcedures, useSites } from "@/features/hooks";
import type { SiteSummary } from "@/lib/api/types";
import { fmtAgo, fmtDate, fmtNum } from "@/lib/format";
import { useEnter } from "@/lib/gsapIn";
import { Pill } from "@/ui/atoms";
import { Card, DataTable, EmptyState, ErrorState, LoadingRows, PageHeader } from "@/ui/cells";
import { Canvas } from "@/ui/templates/ShellLayout";

const PCT = 100;
const LINK = {
  online: { label: "Online", icon: Wifi, tone: "positive" as const },
  degraded: { label: "Degraded", icon: TriangleAlert, tone: "warning" as const },
  offline: { label: "Offline", icon: CloudOff, tone: "negative" as const },
};

export function HubScreen() {
  const sites = useSites();
  const procs = useGroupProcedures();
  const root = useRef<HTMLDivElement>(null);
  useEnter(root);

  return (
    <Canvas>
      <div ref={root} className="flex flex-col gap-6">
        <PageHeader
          title="Group hub"
          subline="Metadata and KPIs only. Cases, photos and dictation never leave each plant."
        />
        {sites.isPending ? <LoadingRows rows={6} pitch="h-28" />
          : sites.isError ? <ErrorState what="sites" onRetry={() => sites.refetch()} />
            : !sites.data.length ? <EmptyState>No plants are federated yet.</EmptyState>
              : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sites.data.map((s) => <li key={s.id}><SiteCard site={s} /></li>)}
                </ul>
              )}
        <Card id="group-procs" title="Group procedures" aside="Adoption across plants" flush>
          {procs.isPending ? <div className="px-5 py-4"><LoadingRows rows={4} /></div>
            : procs.isError ? <div className="px-5 py-4"><ErrorState what="group procedures" onRetry={() => procs.refetch()} /></div>
              : !procs.data?.length ? <div className="px-5 py-4"><EmptyState>No group procedures.</EmptyState></div>
                : (
                  <DataTable
                    label="Group procedures"
                    rows={procs.data}
                    rowKey={(p) => p.code}
                    columns={[
                      { key: "c", label: "Code", cell: (p) => <span className="font-medium num">{p.code}</span> },
                      { key: "t", label: "Title", cell: (p) => p.title },
                      { key: "a", label: "Adopted by", className: "text-right", cell: (p) => <span className="num">{fmtNum(p.adoptedBy)} of {fmtNum(p.plants)}</span> },
                    ]}
                  />
                )}
        </Card>
      </div>
    </Canvas>
  );
}

function SiteCard({ site }: { site: SiteSummary }) {
  const link = LINK[site.link];
  const Icon = link.icon;
  return (
    <Card id={`site-${site.id}`} title={site.name} aside={site.city} detail>
      <dl className="flex flex-col gap-2 text-body">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Link</dt>
          <dd>
            <Pill tone={link.tone}>
              <Icon className="size-3.5" aria-hidden />
              {link.label}
            </Pill>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Open cases</dt>
          <dd className="num">{fmtNum(site.openCases)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">MTTR</dt>
          <dd className="num">{fmtNum(site.mttr)} min</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Coverage</dt>
          <dd className="num">{Math.round(site.coverage * PCT)} %</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Certificate</dt>
          <dd className="text-right">{fmtDate(site.certExpires)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Last snapshot</dt>
          <dd>{fmtAgo(site.lastSnapshotAt)}</dd>
        </div>
      </dl>
    </Card>
  );
}
