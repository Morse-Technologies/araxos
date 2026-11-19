import {
  BarChart3, ClipboardList, FolderKanban, Lightbulb, LayoutDashboard, MonitorPlay, Network, PenTool, ScrollText, Settings, ShieldCheck, Signature, Wrench,
} from "lucide-react";
import type { Role } from "@/lib/api/types";
import type { NavItem } from "@/ui/organisms/AppRail";

/** Screen titles for the scope breadcrumb, by first path segment. */
export const TITLES: Record<string, string> = {
  work: "My work", dashboard: "Dashboard", cases: "Cases", studio: "Studio", review: "Review", knowledge: "Saber", safety: "Safety",
  machines: "Machines", analytics: "Analytics", wall: "Room display", audit: "Audit", hub: "Group hub", settings: "Settings",
};

/** "G" then a letter jumps to a screen (as Atlas). */
export const JUMPS: Record<string, string> = {
  w: "/work", t: "/dashboard", c: "/cases", e: "/studio", r: "/review", b: "/knowledge", s: "/safety",
  m: "/machines", y: "/analytics", d: "/audit", h: "/hub", a: "/settings",
};
export const HINTS: Record<string, string[]> = Object.fromEntries(Object.entries(JUMPS).map(([k, v]) => [v, ["G", k.toUpperCase()]]));

/** Which rail entries each role sees (§15.11); a person with several roles sees the union. */
const RAIL: Record<Role, string[]> = {
  technician: ["/work", "/cases", "/knowledge", "/machines"],
  lead: ["/work", "/dashboard", "/cases", "/safety", "/machines"],
  engineer: ["/dashboard", "/cases", "/studio", "/knowledge", "/review", "/analytics", "/machines"],
  safety_approver: ["/review", "/safety", "/cases", "/audit"],
  auditor: ["/audit", "/cases", "/safety"],
  admin: ["/settings", "/audit"],
  viewer: ["/dashboard", "/analytics", "/wall"],
};
/** Where each role lands after signing in, in order of precedence for people with several roles. */
const HOME: [Role, string][] = [
  ["technician", "/work"], ["lead", "/cases"], ["engineer", "/studio"], ["safety_approver", "/review"],
  ["auditor", "/audit"], ["admin", "/settings"], ["viewer", "/dashboard"],
];
export const homeFor = (roles: Role[]) => HOME.find(([r]) => roles.includes(r))?.[1] ?? "/work";

export type Counts = { mine: number; review: number; knowledge: number; locks: number };
const ALL = (c: Counts): NavItem[][] => [
  [
    { href: "/work", label: "My work", icon: Wrench, count: c.mine || undefined },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/cases", label: "Cases", icon: FolderKanban },
  ],
  [
    { href: "/studio", label: "Studio", icon: PenTool },
    { href: "/review", label: "Review", icon: Signature, count: c.review || undefined },
    { href: "/knowledge", label: "Saber", icon: Lightbulb, count: c.knowledge || undefined },
    { href: "/safety", label: "Safety", icon: ShieldCheck, count: c.locks || undefined },
    { href: "/machines", label: "Machines", icon: ClipboardList },
  ],
  [
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/wall", label: "Room display", icon: MonitorPlay },
    { href: "/audit", label: "Audit", icon: ScrollText },
    { href: "/hub", label: "Group hub", icon: Network },
  ],
];

/** The rail for these roles: the fixed order of every screen, filtered to the union of what the roles see. */
export function navGroups(roles: Role[], counts: Counts): NavItem[][] {
  const visible = new Set(roles.flatMap((r) => RAIL[r]));
  if (roles.includes("admin") || roles.includes("viewer")) visible.add("/hub");
  return ALL(counts).map((g) => g.filter((it) => visible.has(it.href))).filter((g) => g.length);
}
/** Every screen, for the palette and the phone's "More" sheet when the person can open it. */
export const allScreens = (counts: Counts) => ALL(counts).flat();

export const FOOTER: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings }];
