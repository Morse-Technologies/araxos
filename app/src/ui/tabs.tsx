"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { useGlide } from "@/lib/gsapIn";

/** Route tabs with a glass pill that glides to the active one. */
export function LinkTabs({ items, label }: { items: { href: string; label: string }[]; label: string }) {
  const path = usePathname();
  const box = useRef<HTMLElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const active = items.reduce((best, it, i) => (path.startsWith(it.href) && it.href.length > (items[best]?.href.length ?? -1) && path.startsWith(items[best]?.href ?? "") || (path.startsWith(it.href) && best < 0) ? i : best), -1);
  useGlide(pill, () => {
    const el = box.current?.querySelectorAll("a")[active];
    return el ? { x: el.offsetLeft, width: el.offsetWidth } : null;
  }, [active]);
  return (
    <nav ref={box} aria-label={label} className="glass glass-clear sq sq-md relative inline-flex gap-1 p-1">
      <span ref={pill} aria-hidden className="sq sq-sm absolute top-1 left-0 h-8 bg-surface opacity-0 shadow-[0_1px_3px_rgb(16_24_40/0.12)] dark:bg-white/10" />
      {items.map((it, i) => (
        <Link key={it.href} href={it.href} aria-current={i === active ? "page" : undefined}
          className={cn("sq sq-sm relative h-8 px-3.5 text-body leading-8 font-medium text-muted transition-colors hover:text-text", i === active && "text-text")}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
