"use client";
import { Contrast, FileClock, Inbox, Moon, Search, Settings2, Smartphone, Sun, SunMedium, Droplets } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { noteNo } from "@/lib/format";
import { useGlide, useParallax } from "@/lib/gsapIn";
import { t } from "@/lib/i18n";
import { useReducedTransparency, useSunMode, useTheme } from "@/lib/prefs";
import { Avatar, Kbd, Mark } from "@/ui/atoms";
import { Glass } from "@/ui/glass";
import { useQueue } from "@/features/hooks";
import { Palette, type PaletteItem } from "./Palette";

const NAV = [
  { href: "/queue", label: t.nav.queue, icon: Inbox },
  { href: "/history", label: t.nav.history, icon: FileClock },
  { href: "/admin", label: t.nav.admin, icon: Settings2 },
] as const;

function NavTabs({ count }: { count?: number }) {
  const path = usePathname();
  const listRef = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const active = NAV.findIndex((n) => path.startsWith(n.href));
  useGlide(pill, () => {
    const el = listRef.current?.querySelectorAll("a")[active];
    return el ? { x: el.offsetLeft, width: el.offsetWidth } : null;
  }, [active, count]);
  return (
    <nav aria-label="Principal" ref={listRef} className="relative flex items-center gap-1">
      <span ref={pill} aria-hidden className={cn("sq sq-sm absolute top-0 left-0 h-9 bg-[var(--pill-neutral-bg)] opacity-0", active < 0 && "hidden")} />
      {NAV.map((n, i) => (
        <Link key={n.href} href={n.href} aria-current={i === active ? "page" : undefined}
          className={cn("sq sq-sm relative flex h-9 items-center gap-2 px-3.5 text-body font-medium text-muted transition-colors hover:text-text", i === active && "text-text")}>
          <n.icon className="size-4" aria-hidden />
          {n.label}
          {n.href === "/queue" && count ? <span className="tabular rounded-full bg-primary px-1.5 text-small leading-5 text-on-primary">{count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

function usePaletteItems(): PaletteItem[] {
  const router = useRouter();
  const { data } = useQueue();
  const { toggle } = useTheme();
  const [lessGlass, setLessGlass] = useReducedTransparency();
  const [sun, setSun] = useSunMode();
  const notes = (data ?? []).flatMap((g) => g.items).map((n) => ({
    id: n.id, group: t.nav.groups.notes, text: `${n.number} ${n.customer} ${n.summary}`,
    label: <span><span className="tabular font-mono text-muted">{noteNo(n.number)}</span> · {n.customer}</span>, hint: t.states[n.state],
    onSelect: () => router.push(`/queue/${n.id}`),
  }));
  const screens = [
    ...NAV.map((n) => ({ id: n.href, group: t.nav.groups.screens, text: n.label, label: n.label, icon: <n.icon />, onSelect: () => router.push(n.href) })),
    { id: "m", group: t.nav.groups.screens, text: t.nav.mobile, label: t.nav.mobile, icon: <Smartphone />, onSelect: () => router.push("/m") },
    { id: "settings", group: t.nav.groups.screens, text: t.admin.settings, label: t.admin.settings, icon: <Settings2 />, onSelect: () => router.push("/admin/settings") },
  ];
  const actions = [
    { id: "theme", group: t.nav.groups.actions, text: "tema claro oscuro", label: `${t.settings.theme}: ${t.theme.light} / ${t.theme.dark}`, icon: <Moon />, onSelect: () => toggle() },
    { id: "glass", group: t.nav.groups.actions, text: t.settings.transparency, label: t.settings.transparency, hint: lessGlass ? "Sí" : "No", icon: <Droplets />, onSelect: () => setLessGlass(!lessGlass) },
    { id: "sun", group: t.nav.groups.actions, text: t.settings.sun, label: t.settings.sun, hint: sun ? "Sí" : "No", icon: <SunMedium />, onSelect: () => setSun(!sun) },
  ];
  return [...notes, ...screens, ...actions];
}

export function ThemeButton() {
  const { theme, toggle } = useTheme();
  const label = theme === "dark" ? t.theme.toLight : t.theme.toDark;
  return (
    <button type="button" onClick={(e) => toggle(e)} aria-label={label} title={label} data-testid="theme-toggle"
      className="sq sq-sm grid size-9 place-items-center text-muted transition-colors hover:bg-[var(--pill-neutral-bg)] hover:text-text">
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function TransparencyButton() {
  const [on, set] = useReducedTransparency();
  return (
    <button type="button" onClick={() => set(!on)} aria-pressed={on} aria-label={t.settings.transparency} title={t.settings.transparency} data-testid="transparency-toggle"
      className={cn("sq sq-sm grid size-9 place-items-center text-muted transition-colors hover:bg-[var(--pill-neutral-bg)] hover:text-text", on && "bg-[var(--pill-neutral-bg)] text-text")}>
      <Contrast className="size-4" />
    </button>
  );
}

/** Office console chrome: one floating glass bar (the only refracting surface up here), content below with air. */
export function ConsoleShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const items = usePaletteItems();
  const { data } = useQueue();
  const count = data?.reduce((s, g) => s + g.items.length, 0);
  const ground = useRef<HTMLDivElement>(null);
  useParallax(ground);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="min-h-dvh">
      <div ref={ground} className="field-ground" aria-hidden />
      <header className="sticky top-0 z-30 px-6 pt-4">
        <Glass float refract={{ radius: 22, bezel: 16, scale: -42, blur: 10 }} clip={22} className="sq sq-md mx-auto flex h-14 max-w-[1520px] items-center gap-4 pr-2 pl-4">
          <Link href="/queue" className="flex items-center gap-2.5" aria-label={t.app.full}>
            <Mark />
            <span className="text-section font-semibold tracking-tight">{t.app.name}</span>
          </Link>
          <div className="mx-2 h-6 w-px bg-[var(--rule)]" aria-hidden />
          <NavTabs count={count} />
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => setOpen(true)} data-testid="palette-open"
              className="sq sq-sm flex h-9 w-56 items-center gap-2 px-3 text-muted transition-colors hover:bg-[var(--pill-neutral-bg)]">
              <Search className="size-4" aria-hidden />
              <span className="flex-1 text-left">{t.nav.search}</span>
              <Kbd>⌘K</Kbd>
            </button>
            <Link href="/m" title={t.nav.mobile} aria-label={t.nav.mobile} className="sq sq-sm grid size-9 place-items-center text-muted hover:bg-[var(--pill-neutral-bg)] hover:text-text">
              <Smartphone className="size-4" />
            </Link>
            <TransparencyButton />
            <ThemeButton />
            <Avatar initials="CV" className="ml-1" />
          </div>
        </Glass>
      </header>
      <main className="mx-auto max-w-[1520px] px-6 pt-6 pb-10">{children}</main>
      <Palette open={open} onOpenChange={setOpen} items={items} />
    </div>
  );
}
