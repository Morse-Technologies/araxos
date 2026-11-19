import { MOCK_NOW } from "@/lib/clock";
import { digest, hash, seeded } from "../random";
import type { AuditAction, AuditChain, AuditEvent, AuditObjectKind, Id, User } from "../types";
import { MCP_TOKENS } from "./catalog";
import { MACHINES, NORTH, USERS } from "./world";

const MIN = 60_000;
const ENTRIES = 120;
const SPAN_DAYS = 14;
/** The daily anchor seals the chain at 22:00 Madrid (21:00 UTC); later entries wait for the next one. */
export const ANCHOR_AT = "2026-11-18T21:00:00.000Z";
export { digest };

type Who = "any" | "technician" | "lead" | "engineer" | "safety_approver" | "admin" | "auditor" | "mcp" | "system";
type Template = { action: AuditAction; kind: AuditObjectKind; weight: number; who: Who; make: (r: () => number) => { object: string; detail: string } };
const pick = <T,>(r: () => number, rows: T[]) => rows[Math.floor(r() * rows.length)];
const caseNo = (r: () => number) => `CASE-2026-00${300 + Math.floor(r() * 120)}`;
const mcode = (r: () => number) => pick(r, MACHINES).code;

const TEMPLATES: Template[] = [
  { action: "auth.login", kind: "session", weight: 5, who: "any", make: () => ({ object: "Session", detail: "Signed in with password and TOTP" }) },
  { action: "auth.badge", kind: "session", weight: 5, who: "technician", make: (r) => ({ object: pick(r, ["TALLER-2", "TALLER-3", "PANEL-L2"]), detail: "Badge and PIN on a shared terminal" }) },
  { action: "case.open", kind: "case", weight: 4, who: "technician", make: (r) => ({ object: `${caseNo(r)} · ${mcode(r)}`, detail: "Manual incident" }) },
  { action: "case.close", kind: "case", weight: 3, who: "technician", make: (r) => ({ object: caseNo(r), detail: `Closed in ${30 + Math.floor(r() * 80)} min` }) },
  { action: "step.confirm", kind: "step", weight: 8, who: "technician", make: (r) => ({ object: `${caseNo(r)} · step ${2 + Math.floor(r() * 6)}`, detail: "Confirmed with evidence" }) },
  { action: "lock.apply", kind: "lock", weight: 2, who: "technician", make: (r) => ({ object: `L-${10 + Math.floor(r() * 20)} on Q1 · ${mcode(r)}`, detail: "Lock applied, photo attached" }) },
  { action: "lock.verify", kind: "lock", weight: 2, who: "lead", make: (r) => ({ object: `L-${10 + Math.floor(r() * 20)}`, detail: "Verified by a second person on their own device" }) },
  { action: "procedure.sign", kind: "procedure", weight: 1, who: "engineer", make: () => ({ object: "PROC-EXT-RED-003 v4", detail: "Engineering signature, sha256 re-checked" }) },
  { action: "procedure.approve", kind: "procedure", weight: 0.6, who: "safety_approver", make: () => ({ object: "PROC-EXT-RED-003 v3", detail: "Approved: 2 of 2 signatures on the same hash" }) },
  { action: "knowledge.capture", kind: "knowledge", weight: 2, who: "technician", make: (r) => ({ object: `Saber item · ${mcode(r)}`, detail: "Captured from a step" }) },
  { action: "knowledge.accept", kind: "knowledge", weight: 1, who: "engineer", make: () => ({ object: "Saber item", detail: "Incorporated into a draft" }) },
  { action: "evidence.view", kind: "evidence", weight: 3, who: "auditor", make: (r) => ({ object: `Photo · ${caseNo(r)}`, detail: "Viewed full-size evidence" }) },
  { action: "mcp.call", kind: "mcp", weight: 5, who: "mcp", make: (r) => ({ object: pick(r, ["cases.search", "procedures.get", "kpis.get", "machines.list"]), detail: "Read, 20 rows, truncated" }) },
  { action: "device.enroll", kind: "device", weight: 0.4, who: "admin", make: () => ({ object: "TALLER-3", detail: "Terminal enrolled, P-256 key registered" }) },
  { action: "threshold.change", kind: "case", weight: 0.3, who: "admin", make: () => ({ object: "Fast route threshold", detail: "0.80 → 0.82" }) },
  { action: "audit.export", kind: "audit", weight: 0.3, who: "auditor", make: () => ({ object: "Audit log", detail: "Signed export of 30 days" }) },
];
const TOTAL = TEMPLATES.reduce((s, t) => s + t.weight, 0);
function weighted(r: () => number): Template {
  let x = r() * TOTAL;
  for (const t of TEMPLATES) { x -= t.weight; if (x <= 0) return t; }
  return TEMPLATES[0];
}

type Actor = { id: Id | null; name: string; kind: AuditEvent["actorKind"] };
function actorFor(who: Who, r: () => number): Actor {
  if (who === "system") return { id: null, name: "Araxos (system)", kind: "system" };
  if (who === "mcp") { const t = pick(r, MCP_TOKENS.slice(0, 2)); return { id: t.id, name: `MCP: ${t.client}`, kind: "mcp" }; }
  const pool = USERS.filter((u: User) => u.roles.some((x) => who === "any" ? x !== "viewer" : x === who));
  const u = pick(r, pool);
  return { id: u.id, name: u.name, kind: "person" };
}
const ipOf = (a: Actor) => a.kind === "system" ? "127.0.0.1" : `10.20.${(hash(a.name) % 40) + 1}.${(hash(`${a.name}ip`) % 200) + 20}`;

/** Entries over two weeks for North Plant, oldest first, each chained to the one before. */
function build(plantId: Id): AuditEvent[] {
  const r = seeded(hash(`audit-${plantId}`));
  const start = MOCK_NOW - SPAN_DAYS * 1440 * MIN;
  const times = Array.from({ length: ENTRIES }, () => start + r() * (MOCK_NOW - start - 5 * MIN)).sort((a, b) => a - b);
  let prev = digest(`genesis-${plantId}`);
  return times.map((t, i) => {
    const tpl = weighted(r);
    const who = actorFor(tpl.who, r);
    const { object, detail } = tpl.make(r);
    const at = new Date(Math.round(t / MIN) * MIN).toISOString();
    const h = digest(prev + JSON.stringify({ seq: i + 1, at, actor: who.id ?? "system", action: tpl.action, object, detail }));
    const e: AuditEvent = {
      id: `aud-${plantId}-${i + 1}`, seq: i + 1, plantId, at, actorId: who.id, actor: who.name, actorKind: who.kind,
      action: tpl.action, objectKind: tpl.kind, object, detail, ip: ipOf(who), prevHash: prev, hash: h, anchored: at <= ANCHOR_AT,
    };
    prev = h;
    return e;
  });
}

export const AUDIT: AuditEvent[] = build(NORTH);

/** Walks the chain: every entry must point at the previous digest. */
export function verifyChain(rows: AuditEvent[]): AuditChain {
  const sorted = [...rows].sort((a, b) => a.seq - b.seq);
  let brokenAt: number | null = null;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].prevHash !== sorted[i - 1].hash) { brokenAt = sorted[i].seq; break; }
  }
  const sealed = sorted.filter((e) => e.anchored);
  return { ok: brokenAt === null, checked: sorted.length, anchorAt: ANCHOR_AT, anchorHash: sealed.at(-1)?.hash ?? "", pending: sorted.length - sealed.length, brokenAt };
}

export type AuditInput = Pick<AuditEvent, "at" | "actorId" | "actor" | "action" | "objectKind" | "object" | "detail"> & { actorKind?: AuditEvent["actorKind"] };
/** Appends one entry to a plant's chain (the mock's writes), linked to the last digest. */
export function appendAudit(rows: AuditEvent[], plantId: Id, e: AuditInput): AuditEvent {
  const last = rows.filter((x) => x.plantId === plantId).reduce<AuditEvent | null>((a, x) => (!a || x.seq > a.seq ? x : a), null);
  const seq = (last?.seq ?? 0) + 1;
  const prevHash = last?.hash ?? digest(`genesis-${plantId}`);
  const body = { seq, at: e.at, actor: e.actorId ?? "system", action: e.action, object: e.object, detail: e.detail };
  const entry: AuditEvent = { actorKind: "person", ip: "10.20.4.31", ...e, id: `aud-${plantId}-${seq}`, seq, plantId, prevHash, hash: digest(prevHash + JSON.stringify(body)), anchored: false };
  rows.push(entry);
  return entry;
}
