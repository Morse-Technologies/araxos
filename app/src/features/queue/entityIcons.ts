import { Building2, Calendar, Cog, Hash, MapPin, Package, Timer, User, type LucideIcon } from "lucide-react";
import type { Entity, EntityType } from "@/lib/api";

/** Lucide glyph per entity type (§7.4). */
export const ENTITY_ICON: Record<EntityType, LucideIcon> = {
  customer: Building2, product: Package, asset: Cog, date: Calendar, duration: Timer, person: User, address: MapPin, quantity: Hash,
};

/** High ≥ 0.85, medium ≥ 0.65, otherwise low (supuesto de diseño, §7.4). */
export const confidenceLevel = (c: number): "high" | "medium" | "low" => (c >= 0.85 ? "high" : c >= 0.65 ? "medium" : "low");

/** Splits transcript words into plain runs and entity spans, in order. */
export function segments(wordCount: number, entities: Entity[]) {
  const sorted = [...entities].sort((a, b) => a.from - b.from);
  const out: ({ kind: "words"; from: number; to: number } | { kind: "entity"; entity: Entity })[] = [];
  let i = 0;
  for (const e of sorted) {
    if (e.from < i) continue;
    if (e.from > i) out.push({ kind: "words", from: i, to: e.from - 1 });
    out.push({ kind: "entity", entity: e });
    i = e.to + 1;
  }
  if (i < wordCount) out.push({ kind: "words", from: i, to: wordCount - 1 });
  return out;
}
