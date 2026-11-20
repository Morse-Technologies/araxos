"use client";
import { CornerDownLeft, Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { Kbd } from "@/ui/atoms";
import { Modal } from "@/ui/overlay";

export type PaletteItem = { id: string; group: string; label: ReactNode; text: string; hint?: ReactNode; icon?: ReactNode; onSelect: () => void };

/** ⌘K: open a note, jump to a screen or run an action. Arrow keys move, Enter runs. */
export function Palette({ open, onOpenChange, items }: { open: boolean; onOpenChange: (o: boolean) => void; items: PaletteItem[] }) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const q = query.trim().toLowerCase();
  const all = q ? items.filter((i) => i.text.toLowerCase().includes(q)) : items;
  const at = Math.min(cursor, Math.max(0, all.length - 1));
  const groups = all.reduce<Record<string, PaletteItem[]>>((acc, it) => ((acc[it.group] ??= []).push(it), acc), {});
  const run = (it?: PaletteItem) => { if (!it) return; it.onSelect(); onOpenChange(false); setQuery(""); };

  return (
    <Modal open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQuery(""); }} title={t.nav.palette} labelHidden instant className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-rule px-5">
        <Search aria-hidden className="size-4 text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setCursor(Math.min(at + 1, all.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setCursor(Math.max(at - 1, 0)); }
            if (e.key === "Enter") { e.preventDefault(); run(all[at]); }
          }}
          role="combobox"
          aria-expanded
          aria-controls="palette-list"
          aria-activedescendant={all[at] ? `pal-${all[at].id}` : undefined}
          placeholder={t.nav.searchHint}
          className="h-14 flex-1 bg-transparent text-section outline-none placeholder:text-faint"
        />
        <Kbd>Esc</Kbd>
      </div>
      <div id="palette-list" role="listbox" aria-label={t.nav.palette} className="scroll-soft max-h-[min(420px,60vh)] overflow-y-auto p-2">
        {all.length === 0 && <p className="px-3 py-6 text-center text-muted">{t.nav.nothing}</p>}
        {Object.entries(groups).map(([group, list]) => (
          <div key={group} role="group" aria-label={group} className="mb-1">
            <div className="px-3 pt-2 pb-1 text-small text-muted">{group}</div>
            {list.map((it) => {
              const i = all.indexOf(it);
              return (
                <div key={it.id} id={`pal-${it.id}`} role="option" aria-selected={i === at} onMouseMove={() => setCursor(i)} onClick={() => run(it)}
                  className={cn("sq sq-xs flex h-11 cursor-default items-center gap-3 px-3 [&_svg]:size-4 [&_svg]:text-muted", i === at && "bg-[var(--pill-neutral-bg)]")}>
                  {it.icon}
                  <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  {it.hint && <span className="text-small text-muted">{it.hint}</span>}
                  {i === at && <CornerDownLeft aria-hidden />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Modal>
  );
}
