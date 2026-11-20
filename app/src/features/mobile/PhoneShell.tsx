"use client";
import { Car, History, Home, Mic, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useParallax } from "@/lib/gsapIn";
import { t } from "@/lib/i18n";
import { Mark } from "@/ui/atoms";
import { Glass } from "@/ui/glass";
import { ThemeButton } from "@/features/shell/ConsoleShell";

const TABS = [
  { href: "/m", label: t.mobile.tabs.home, icon: Home, exact: true },
  { href: "/m/record", label: t.mobile.tabs.record, icon: Mic },
  { href: "/m/history", label: t.mobile.tabs.history, icon: History },
  { href: "/m/car", label: t.mobile.tabs.car, icon: Car },
];

function TabBar() {
  const path = usePathname();
  if (path.startsWith("/m/car") || path.startsWith("/m/record")) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-5 pb-[max(16px,env(safe-area-inset-bottom))]">
      <Glass as="nav" aria-label="App" float refract={{ radius: 30, bezel: 16, scale: -44, blur: 16 }} clip={30}
        className="sq sq-xl pointer-events-auto flex w-full max-w-[360px] items-center justify-around px-2 py-1.5">
        {TABS.map((tab) => {
          const on = tab.exact ? path === tab.href : path.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} aria-current={on ? "page" : undefined}
              className={cn("sq sq-md flex min-w-16 flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium text-muted transition-colors", on && "bg-[var(--pill-neutral-bg)] text-text")}>
              <tab.icon className="size-5" aria-hidden />{tab.label}
            </Link>
          );
        })}
      </Glass>
    </div>
  );
}

/**
 * The phone screens. On a phone they fill the viewport; on a desktop they sit in a squircle device frame so the
 * office can see exactly what the technician sees.
 */
export function PhoneShell({ children }: { children: ReactNode }) {
  const ground = useRef<HTMLDivElement>(null);
  useParallax(ground);
  return (
    <div className="min-h-dvh sm:grid sm:place-items-center sm:p-8">
      <div ref={ground} className="field-ground" aria-hidden />
      <div className="sm:flex sm:items-center sm:gap-12">
        <div className="relative h-dvh w-full overflow-hidden sm:sq sm:sq-xl sm:h-[844px] sm:w-[390px] sm:shadow-[0_0_0_10px_#0e1013,0_0_0_11px_#2a2e35,0_40px_80px_-20px_rgb(0_0_0/0.45)]" data-testid="phone">
          <div className="field-ground !absolute !inset-0" aria-hidden />
          <div className="scroll-soft relative h-full overflow-y-auto" data-lenis-prevent data-phone-scroll>{children}</div>
          <TabBar />
        </div>
        <aside className="hidden max-w-[300px] sm:block">
          <div className="mb-4 flex items-center gap-2.5"><Mark /><span className="text-section font-semibold">{t.app.full}</span></div>
          <p className="text-body text-muted">{t.mobile.frameCaption}</p>
          <div className="mt-6 flex items-center gap-2">
            <Link href="/queue" className="sq sq-sm glass flex h-10 items-center gap-2 px-4 font-medium"><ArrowLeft className="size-4" />{t.nav.queue}</Link>
            <ThemeButton />
          </div>
        </aside>
      </div>
    </div>
  );
}
