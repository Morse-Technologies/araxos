"use client";
import { useCallback, useState } from "react";
import { followSystem, pinTheme, useTheme, type Theme } from "@/features/shell/theme";
import { useStation } from "@/features/session";
import type { Density } from "@/lib/api/types";
import { densityInfo } from "@/lib/labels";
import { Switch } from "@/ui/atoms";
import { Segmented } from "@/ui/cells";

const DENSITIES: Density[] = ["office", "workshop", "panel"];

type Appearance = Theme | "system";
function readAppearance(): Appearance {
  if (typeof document === "undefined") return "system";
  const pinned = document.documentElement.dataset.theme;
  if (pinned === "light" || pinned === "dark") return pinned;
  return "system";
}

/** Theme, density and contrast belong to the screen, not the person: a shared terminal keeps its own (§23.11). */
export function StationPanel() {
  const station = useStation();
  const { theme, toggle } = useTheme();
  const [choice, setChoice] = useState<Appearance>(readAppearance);

  const onChange = useCallback((next: Appearance) => {
    setChoice(next);
    if (next === "system") {
      followSystem();
      return;
    }
    if (theme !== next) toggle();
    else pinTheme(next);
  }, [theme, toggle]);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-section font-medium">Theme</h2>
        <p className="text-body text-muted">Chrome stays ink either way. Pick a theme or follow the operating system.</p>
        <Segmented label="Theme" value={choice} onChange={(v) => onChange(v)}
          options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "System" }]} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-section font-medium">Density</h2>
        <p className="text-body text-muted">{densityInfo[station.density].help}</p>
        <Segmented label="Density" value={station.density} onChange={(density) => station.set({ density })}
          options={DENSITIES.map((d) => ({ value: d, label: densityInfo[d].label }))} />
        <p className="text-small text-muted">The wall density is only for the room display at /wall.</p>
      </section>
      <section className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-section font-medium">Plant contrast</h2>
          <p className="mt-1 text-body text-muted">Stronger borders and text, and states doubled with icons and words, for screens under bright plant light.</p>
        </div>
        <Switch aria-label="Plant contrast" checked={station.plant} onCheckedChange={(plant) => station.set({ plant })} />
      </section>
    </div>
  );
}
