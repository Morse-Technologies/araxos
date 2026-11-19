"use client";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardCheck, FolderKanban, LogOut, Monitor, MonitorSmartphone, Moon, PanelLeft, RotateCcw, Sun, SunMedium, UserRound, Users, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ViewTransition, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import { useCases, useKnowledge, useLocks, useMachines, useMe, useOverview, useProcedures, useSwitchUser, useUsers } from "@/features/hooks";
import { useApplyDensity, useStation } from "@/features/session";
import { resetMock, type Case, type Machine, type Procedure } from "@/lib/api";
import { roleInfo, SEVERITY_ORDER, densityInfo } from "@/lib/labels";
import { useMod } from "@/lib/platform";
import { Kbd, Pill, Spinner } from "@/ui/atoms";
import { Menu, SeverityGlyph, Sheet } from "@/ui/cells";
import { AppSidebar, BottomBar, type NavItem } from "@/ui/organisms/AppRail";
import { CommandPalette, type PaletteItem } from "@/ui/organisms/CommandPalette";
import { ShellLayout, TopBar } from "@/ui/templates/ShellLayout";
import { FOOTER, HINTS, JUMPS, TITLES, navGroups, type Counts } from "./nav";
import { followSystem, useTheme } from "./theme";

const BOTTOM_BAR_ITEMS = 4;
const G_CHORD_MS = 900;
const PEEK_ITEMS = 4;
const PALETTE_MAX = 6;

const isOpen = (c: Case) => c.status !== "closed";
const bySeverity = (a: Case, b: Case) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);

/** Hovering Cases on the collapsed rail shows the most urgent open cases (300px peek, as in Atlas). */
function CasesPeek({ cases, machines }: { cases: Case[]; machines: Machine[] }) {
  const open = cases.filter(isOpen).sort(bySeverity);
  return (
    <div>
      <div className="flex items-baseline justify-between px-1 pb-2">
        <span className="text-body font-medium">Open cases</span>
        <Link href="/cases" className="text-small text-muted hover:text-text">View all {open.length}</Link>
      </div>
      <ul className="flex flex-col">
        {open.slice(0, PEEK_ITEMS).map((c) => (
          <li key={c.id}>
            <Link href={`/cases?id=${c.id}`} className="flex items-start gap-2 rounded-control px-1.5 py-2 hover:bg-raised">
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-body">{c.symptom}</span>
                <span className="text-small text-muted">{machines.find((m) => m.id === c.machineId)?.code} · {c.code}</span>
              </span>
              <SeverityGlyph severity={c.severity} label={false} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Sidebar state, remembered per browser. */
const NAV_KEY = "araxos-nav";
const readNav = () => { try { return localStorage.getItem(NAV_KEY) === "expanded"; } catch { return false; } };
const subscribeNav = (cb: () => void) => { window.addEventListener(NAV_KEY, cb); return () => window.removeEventListener(NAV_KEY, cb); };
function useSidebar() {
  const expanded = useSyncExternalStore(subscribeNav, readNav, () => false);
  const toggle = useCallback(() => {
    try { localStorage.setItem(NAV_KEY, readNav() ? "collapsed" : "expanded"); } catch {}
    window.dispatchEvent(new Event(NAV_KEY));
  }, []);
  return { expanded, toggle };
}

/** ⌘K palette, ⌘\\ sidebar, and "G then a letter" jumps (ignored while typing). */
function useShellShortcuts({ onPalette, onToggleNav }: { onPalette: () => void; onToggleNav: () => void }) {
  const router = useRouter();
  const pendingG = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); onPalette(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") { e.preventDefault(); onToggleNav(); return; }
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest("input, textarea, select, [contenteditable=true], [data-keys-local]")) return;
      if (pendingG.current) {
        clearTimeout(pendingG.current); pendingG.current = null;
        const to = JUMPS[e.key.toLowerCase()];
        if (to) { e.preventDefault(); router.push(to); }
        return;
      }
      if (e.key.toLowerCase() === "g") pendingG.current = setTimeout(() => { pendingG.current = null; }, G_CHORD_MS);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPalette, onToggleNav, router]);
}

type PaletteSource = {
  query: string; screens: NavItem[]; cases: Case[]; machines: Machine[]; procedures: Procedure[];
  nav: ReturnType<typeof useSidebar>; theme: ReturnType<typeof useTheme>; station: ReturnType<typeof useStation>; onReset: () => void;
};
const keys = (k: string[]) => <span className="flex gap-0.5">{k.map((x) => <Kbd key={x}>{x}</Kbd>)}</span>;

/** Rows that find things: cases, procedures and machines, only once the person types. */
function useFindItems({ query, cases, machines, procedures }: Pick<PaletteSource, "query" | "cases" | "machines" | "procedures">): PaletteItem[] {
  const router = useRouter();
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const has = (s: string) => s.toLowerCase().includes(q);
    const code = (id: string) => machines.find((m) => m.id === id)?.code ?? "";
    return [
      ...cases.filter((c) => has(`${c.code} ${code(c.machineId)} ${c.symptom}`)).slice(0, PALETTE_MAX).map<PaletteItem>((c) => ({ id: `c-${c.id}`, group: "Cases", label: `${c.code} · ${c.symptom}`, hint: code(c.machineId), icon: <FolderKanban />, onSelect: () => router.push(`/cases?id=${c.id}`) })),
      ...procedures.filter((p) => has(`${p.code} ${p.title}`)).slice(0, PALETTE_MAX).map<PaletteItem>((p) => ({ id: `p-${p.id}`, group: "Procedures", label: `${p.code} · ${p.title}`, icon: <ClipboardCheck />, onSelect: () => router.push(`/studio?p=${p.id}`) })),
      ...machines.filter((m) => has(`${m.code} ${m.name}`)).slice(0, PALETTE_MAX).map<PaletteItem>((m) => ({ id: `m-${m.id}`, group: "Machines", label: `${m.code}, ${m.name}`, hint: m.line, icon: <Wrench />, onSelect: () => router.push(`/machines?id=${m.id}`) })),
    ];
  }, [query, cases, machines, procedures, router]);
}

/** Palette rows: what was found, then screens, then actions (theme, density, plant mode, demo reset). */
function usePaletteItems(s: PaletteSource): PaletteItem[] {
  const router = useRouter();
  const found = useFindItems(s);
  const { query, screens, nav, theme, station, onReset } = s;
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (label: string) => !q || label.toLowerCase().includes(q);
    const goTo = screens.filter((n) => matches(n.label)).map<PaletteItem>((n) => ({
      id: `go-${n.href}`, group: "Go to", label: n.label, icon: <n.icon />, onSelect: () => router.push(n.href), hint: HINTS[n.href] ? keys(HINTS[n.href]) : undefined,
    }));
    const actions: PaletteItem[] = [
      { id: "act-new", group: "Actions", label: "New incident", icon: <FolderKanban />, onSelect: () => router.push("/cases/new"), hint: keys(["N"]) },
      { id: "act-nav", group: "Actions", label: nav.expanded ? "Collapse sidebar" : "Expand sidebar", icon: <PanelLeft />, onSelect: nav.toggle, hint: keys(["⌘", "\\"]) },
      { id: "act-theme", group: "Actions", label: theme.theme === "dark" ? "Switch to light theme" : "Switch to dark theme", icon: theme.theme === "dark" ? <Sun /> : <Moon />, onSelect: () => theme.toggle() },
      { id: "act-system", group: "Actions", label: "Follow the system theme", icon: <Monitor />, onSelect: followSystem },
      { id: "act-plant", group: "Actions", label: station.plant ? "Turn plant contrast off" : "Turn plant contrast on", icon: <SunMedium />, onSelect: () => station.set({ plant: !station.plant }) },
      ...(["office", "workshop", "panel"] as const).map<PaletteItem>((d) => ({ id: `act-d-${d}`, group: "Actions", label: `Density: ${densityInfo[d].label}`, icon: d === station.density ? <Check /> : <MonitorSmartphone />, onSelect: () => station.set({ density: d }) })),
      { id: "act-kiosk", group: "Actions", label: "Open the shared terminal (kiosk)", icon: <Users />, onSelect: () => router.push("/kiosk") },
      { id: "act-reset", group: "Actions", label: "Reset the demo data", icon: <RotateCcw />, onSelect: onReset },
    ].filter((a) => matches(String(a.label)));
    return [...found, ...goTo, ...actions];
  }, [found, query, screens, nav, theme, station, router, onReset]);
}

/** The scope breadcrumb: the plant, the screen, and the sync state of this station (`AxSyncStrip`). */
function Scope({ pathname, plant }: { pathname: string; plant: string }) {
  const [first] = pathname.split("/").slice(1);
  return (
    <>
      <span className="truncate text-text">{plant}</span>
      <span aria-hidden>/</span>
      <span className="truncate">{TITLES[first ?? ""] ?? ""}</span>
      <Pill tone="positive" className="ml-2 hidden sm:inline-flex">Online · 0 pending</Pill>
      <Pill className="ml-auto sm:ml-2">Mock data</Pill>
    </>
  );
}

/** Mock only: who the screens act as. The real app has one signed-in person; this lets the demo show every role. */
function ActingAs() {
  const { data: me } = useMe();
  const { data: users } = useUsers();
  const switchUser = useSwitchUser();
  if (!me) return null;
  return (
    <Menu
      trigger={<button type="button" aria-label="Act as another person" className="inline-flex h-8 items-center gap-1.5 rounded-control border border-control px-2.5 text-body text-muted hover:text-text"><UserRound className="size-4" />{me.name}<span className="hidden text-small xl:inline">· {me.roles.map((r) => roleInfo[r].label).join(", ")}</span></button>}
      items={(users ?? []).map((u) => ({ label: `${u.name} · ${u.roles.map((r) => roleInfo[r].label).join(", ")}`, icon: u.id === me.id ? <Check /> : <UserRound />, onClick: () => switchUser.mutate(u.id, { onSuccess: () => toast(`Acting as ${u.name}`) }) }))}
    />
  );
}

function useCounts(): Counts {
  const { data: me } = useMe();
  const { data: cases } = useCases();
  const { data: overview } = useOverview();
  const { data: knowledge } = useKnowledge();
  const { data: locks } = useLocks();
  return {
    mine: cases?.filter((c) => c.assigneeId === me?.id && isOpen(c)).length ?? 0,
    review: overview?.pendingApprovals ?? 0,
    knowledge: knowledge?.filter((k) => k.status === "captured" || k.status === "in_review").length ?? 0,
    locks: locks?.filter((l) => l.state === "applied" || l.state === "removal_pending").length ?? 0,
  };
}

export function AppShell({ children }: { children: ReactNode }) {
  const mod = useMod();
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: cases } = useCases();
  const { data: machines } = useMachines();
  const { data: procedures } = useProcedures();
  const themeState = useTheme();
  const station = useStation();
  useApplyDensity();
  const nav = useSidebar();
  const [palette, setPalette] = useState(false);
  const [more, setMore] = useState(false);
  const [query, setQuery] = useState("");
  const fetching = useIsFetching();
  const togglePalette = useCallback(() => setPalette((o) => !o), []);
  useShellShortcuts({ onPalette: togglePalette, onToggleNav: nav.toggle });

  const counts = useCounts();
  const groups = useMemo(() => navGroups(me?.roles ?? [], counts), [me?.roles, counts]);
  const all = useMemo(() => [...groups.flat(), ...FOOTER], [groups]);
  const onReset = useCallback(() => { resetMock(); void qc.invalidateQueries(); toast("Demo data reset to the snapshot"); }, [qc]);
  const paletteItems = usePaletteItems({ query, screens: all, cases: cases ?? [], machines: machines ?? [], procedures: procedures ?? [], nav, theme: themeState, station, onReset });
  const accountItems = [
    { label: "Lock this station", icon: <Users />, onClick: () => router.push("/kiosk") },
    { label: "Sign out", icon: <LogOut />, onClick: () => router.push("/login") },
  ];

  return (
    <ShellLayout
      rail={
        <AppSidebar
          groups={groups} footer={FOOTER} pathname={pathname} user={me ?? undefined}
          expanded={nav.expanded} onToggleExpanded={nav.toggle}
          peek={{ href: "/cases", content: <CasesPeek cases={cases ?? []} machines={machines ?? []} /> }}
          theme={themeState.theme} onToggleTheme={(e) => themeState.toggle(e)} accountItems={accountItems}
        />
      }
      topbar={
        <TopBar scope={<Scope pathname={pathname} plant="North Plant" />}>
          <span role="status" aria-live="polite" className={`inline-flex items-center gap-1.5 text-small text-muted transition-opacity duration-[var(--dur-2)] ${fetching ? "opacity-100" : "opacity-0"}`}>
            <Spinner className="size-3" />{fetching ? "Updating" : ""}
          </span>
          <ActingAs />
          <button
            type="button" onClick={() => setPalette(true)}
            className="hidden h-8 w-64 items-center justify-between rounded-control border border-control bg-surface px-3 text-body text-faint transition-colors duration-[var(--dur-1)] hover:border-muted lg:flex"
          >
            Search cases, procedures, machines
            <span className="text-small">{mod === "⌘" ? "⌘K" : "Ctrl K"}</span>
          </button>
        </TopBar>
      }
      bottomBar={<BottomBar items={all.slice(0, BOTTOM_BAR_ITEMS)} pathname={pathname} onMore={() => setMore(true)} />}
    >
      <ViewTransition key={pathname.split("/")[1]} enter="page-enter" exit="page-exit" default="none">
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </ViewTransition>
      <CommandPalette open={palette} onOpenChange={(o) => { setPalette(o); if (!o) setQuery(""); }} query={query} onQueryChange={setQuery} items={paletteItems} />
      <Sheet open={more} onOpenChange={setMore} title="Araxos" description="North Plant">
        <nav aria-label="All screens" className="flex flex-col p-2">
          {all.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setMore(false)} className="flex h-11 items-center gap-3 rounded-control px-3 text-body hover:bg-raised">
              <n.icon className="size-[18px] text-muted" strokeWidth={1.6} />{n.label}
            </Link>
          ))}
        </nav>
      </Sheet>
    </ShellLayout>
  );
}
