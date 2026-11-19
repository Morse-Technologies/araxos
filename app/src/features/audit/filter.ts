import type { AuditEvent, AuditObjectKind } from "@/lib/api/types";

export type AuditRange = "24h" | "7d" | "30d";
export type AuditFilter = { actor: string; kind: AuditObjectKind | ""; text: string; range: AuditRange };

export const SYSTEM_ACTOR = "system";
/** Every MCP client at once: a model's calls are filtered apart from people's (§22.1). */
export const MCP_ACTOR = "mcp";
const RANGE_MS: Record<AuditRange, number> = { "24h": 86_400_000, "7d": 604_800_000, "30d": 2_592_000_000 };

/** Actor, object kind, free text over object and detail, and a time window ending at `now`. */
export function filterAudit(rows: AuditEvent[], f: AuditFilter, now: number): AuditEvent[] {
  const since = now - RANGE_MS[f.range];
  const text = f.text.trim().toLowerCase();
  return rows.filter((e) =>
    Date.parse(e.at) >= since
    && (!f.actor || (f.actor === SYSTEM_ACTOR || f.actor === MCP_ACTOR ? e.actorKind === f.actor : e.actorId === f.actor))
    && (!f.kind || e.objectKind === f.kind)
    && (!text || `${e.object} ${e.detail}`.toLowerCase().includes(text)));
}
