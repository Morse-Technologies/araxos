import { sha256 } from "../random";
import type { Case, Evidence, KnowledgeItem, Lock, Proposal, StepRun } from "../types";
import { VERSIONS } from "./procedures";
import { DAY, NORTH, ago } from "./world";

const ev = (id: string, e: Omit<Evidence, "id" | "sha256">): Evidence => ({ id, sha256: sha256(id), ...e });
const photo = (id: string, label: string, at: string, by: string) => ev(id, { kind: "photo", label, at, by, value: null, unit: null, inRange: null });
const measure = (id: string, v: { label: string; at: string; by: string; value: number; unit: string; inRange: boolean }) => ev(id, { kind: "measurement", ...v });

/** Step runs for a version: the first `done` steps confirmed, the next one current, the rest pending. */
function runs(versionId: string, done: number, by: string, startMin: number, evidence: Record<string, Evidence[]> = {}): StepRun[] {
  const steps = VERSIONS.find((v) => v.id === versionId)!.steps;
  return steps.map((s, i) => ({
    key: s.key, state: i < done ? "done" : i === done ? "current" : "pending",
    at: i < done ? ago(startMin - i * 4) : null, by: i < done ? by : null, evidence: evidence[s.key] ?? [],
  }));
}

const slow = (diagnosis: string, versionId: string, why: Proposal["why"]): Proposal => ({ route: "slow", diagnosis, confidence: "medium", versionId, why, reason: null });
const fast = (versionId: string, why: Proposal["why"]): Proposal => ({ route: "fast", diagnosis: null, confidence: "high", versionId, why, reason: null });
const ABSTAIN: Proposal = { route: "abstain", diagnosis: null, confidence: null, versionId: null, why: [], reason: "No approved procedure covers a hopper blockage on this pelletiser yet." };

type C = Pick<Case, "machineId" | "symptom" | "severity" | "status" | "assigneeId" | "line" | "area"> & Partial<Case> & { n: number; opened: number };
const mk = (c: C): Case => ({
  id: `c-${c.n}`, code: `CASE-2026-00${c.n}`, plantId: NORTH, origin: "manual", closedAt: null, versionId: null, steps: [], proposal: null,
  pendingOps: 0, close: null, openedAt: ago(c.opened), ...c,
});

const EXT3 = "pv-ext-003-3";
export const CASES: Case[] = [
  mk({ n: 421, machineId: "m-ext-04", symptom: "High vibration on the reducer, drive end", severity: "high", status: "in_progress", assigneeId: "u-jgarcia", line: "L2", area: "Extrusion", opened: 98,
    origin: "viper_alert", versionId: EXT3,
    proposal: slow("Drive-end bearing wear", EXT3, [{ kind: "viper", label: "Viper alert · EXT-04 · vib_rms 7.9 mm/s", ref: "VA-1182" }, { kind: "case", label: "CASE-2026-00377 (similar)", ref: "c-377" }, { kind: "manual", label: "Reducer R-200 manual, p. 47", ref: "R-200#47" }]),
    steps: runs(EXT3, 2, "u-jgarcia", 38, {
      s1: [photo("e-421-1", "Lock L-17 on Q1", ago(38), "J. García"), photo("e-421-2", "Tag with the case number", ago(37), "J. García")],
      s2: [measure("e-421-3", { label: "Voltage between phases", at: ago(34), by: "J. García", value: 0.4, unit: "V", inRange: true })],
    }) }),
  mk({ n: 424, machineId: "m-ext-03", symptom: "Metallic knocking at the drive-end bearing", severity: "medium", status: "in_progress", assigneeId: "u-aruiz", line: "L2", area: "Extrusion", opened: 22,
    versionId: EXT3, proposal: fast(EXT3, [{ kind: "case", label: "CASE-2026-00377 (similar)", ref: "c-377" }, { kind: "procedure", label: "PROC-EXT-RED-003 v3", ref: EXT3 }]),
    steps: runs(EXT3, 0, "u-aruiz", 0) }),
  mk({ n: 420, machineId: "m-pel-02", symptom: "Hopper blocked, feeder stalls", severity: "medium", status: "open", assigneeId: "u-aruiz", line: "L2", area: "Extrusion", opened: 64, proposal: ABSTAIN }),
  mk({ n: 422, machineId: "m-cmp-01", symptom: "Air leak survey, pressure drops at night", severity: "low", status: "open", assigneeId: null, line: "L4", area: "Utilities", opened: 51, pendingOps: 2 }),
  mk({ n: 423, machineId: "m-cnv-05", symptom: "Belt drifting to the left at the tail", severity: "low", status: "open", assigneeId: null, line: "L1", area: "Extrusion", opened: 30 }),
  mk({ n: 418, machineId: "m-ext-01", symptom: "Drive-end bearing hot after a restart", severity: "medium", status: "blocked", assigneeId: "u-nrey", line: "L1", area: "Extrusion", opened: 130,
    versionId: EXT3, proposal: fast(EXT3, [{ kind: "procedure", label: "PROC-EXT-RED-003 v3", ref: EXT3 }]),
    steps: runs(EXT3, 0, "u-nrey", 0, { s1: [photo("e-418-1", "Lock L-09 on Q1", ago(52), "N. Rey")] }) }),
  mk({ n: 419, machineId: "m-cmp-01", symptom: "Compressor trips on high temperature", severity: "medium", status: "closed", assigneeId: "u-dcosta", line: "L4", area: "Utilities", opened: 5 * 60, closedAt: ago(4 * 60 - 74),
    versionId: "pv-cmp-001-5", close: { cause: "Fouled oil cooler", solution: "Cleaned the cooler fins and replaced the filter", parts: ["Oil filter CF-220"], minutes: 74, helped: "yes", change: "" } }),
  mk({ n: 417, machineId: "m-ext-04", symptom: "Zone 3 temperature unstable", severity: "low", status: "closed", assigneeId: "u-jgarcia", line: "L2", area: "Extrusion", opened: 3 * DAY, closedAt: ago(3 * DAY - 52),
    versionId: "pv-ext-007-2", close: { cause: "Loose thermocouple", solution: "Re-seated and tightened the thermocouple", parts: [], minutes: 52, helped: "partly", change: "Add a step to check the thermocouple first." } }),
  mk({ n: 416, machineId: "m-cnv-05", symptom: "Belt edge fraying", severity: "low", status: "closed", assigneeId: "u-nrey", line: "L1", area: "Extrusion", opened: 4 * DAY, closedAt: ago(4 * DAY - 40),
    versionId: "pv-cnv-002-3", close: { cause: "Misaligned tail pulley", solution: "Realigned and re-tensioned", parts: [], minutes: 40, helped: "yes", change: "" } }),
  mk({ n: 377, machineId: "m-ext-04", symptom: "Bearing noise, drive end", severity: "high", status: "closed", assigneeId: "u-jgarcia", line: "L2", area: "Extrusion", opened: 26 * DAY, closedAt: ago(26 * DAY - 96),
    versionId: EXT3, close: { cause: "Worn drive-end bearing", solution: "Replaced bearing 6312-2Z/C3", parts: ["Bearing 6312-2Z/C3"], minutes: 96, helped: "partly", change: "The cover has 8 bolts, not 6." } }),
];
export const LOCKS: Lock[] = [
  { id: "L-17", caseId: "c-421", machineId: "m-ext-04", stepKey: "s1", point: "Q1", state: "verified", appliedBy: "u-jgarcia", appliedAt: ago(38), appliedDevice: "t-taller2", photo: true,
    verifiedBy: "u-mlosada", verifiedAt: ago(35), verifiedDevice: "p-mlosada", removedAt: null, removalVerifiedBy: null, removalVerifiedAt: null },
  { id: "L-09", caseId: "c-418", machineId: "m-ext-01", stepKey: "s1", point: "Q1", state: "applied", appliedBy: "u-nrey", appliedAt: ago(52), appliedDevice: "p-armario-1", photo: true,
    verifiedBy: null, verifiedAt: null, verifiedDevice: null, removedAt: null, removalVerifiedBy: null, removalVerifiedAt: null },
  { id: "L-04", caseId: "c-377", machineId: "m-ext-04", stepKey: "s1", point: "Q1", state: "removed", appliedBy: "u-jgarcia", appliedAt: ago(26 * DAY), appliedDevice: "p-armario-2", photo: true,
    verifiedBy: "u-mlosada", verifiedAt: ago(26 * DAY - 3), verifiedDevice: "p-mlosada", removedAt: ago(26 * DAY - 90), removalVerifiedBy: "u-mlosada", removalVerifiedAt: ago(26 * DAY - 92) },
];

type K = Omit<KnowledgeItem, "id" | "at" | "authorKind" | "transcript" | "photos" | "reason" | "incorporatedIn"> & Partial<KnowledgeItem> & { n: number; min: number };
const k = (x: K): KnowledgeItem => ({ id: `k-${x.n}`, at: ago(x.min), authorKind: "person", transcript: null, photos: 0, reason: null, incorporatedIn: null, ...x });
export const KNOWLEDGE: KnowledgeItem[] = [
  k({ n: 1, min: 26 * DAY - 95, caseId: "c-377", procedureId: "pr-ext-003", stepKey: "s3", author: "Javier García", kind: "step_change", text: "The cover has 8 bolts, not 6. Loosen them crosswise or the cover binds.", status: "accepted", photos: 1, incorporatedIn: "PROC-EXT-RED-003 v4" }),
  k({ n: 2, min: 3 * DAY - 50, caseId: "c-417", procedureId: "pr-ext-007", stepKey: "s2", author: "Javier García", kind: "new_step", text: "Check the zone 3 thermocouple is seated before reading the temperatures.", transcript: "primero miro que el termopar de la zona tres esté bien metido…", status: "in_review" }),
  k({ n: 3, min: 140, caseId: "c-419", procedureId: "pr-cmp-001", stepKey: null, author: "Diego Costa", kind: "note", text: "Night pressure drop is the dryer purge valve sticking open, not a leak.", status: "captured", photos: 2 }),
  k({ n: 4, min: 600, caseId: null, procedureId: "pr-cnv-002", stepKey: "s2", author: "Noelia Rey", kind: "photo", text: "This is what a correctly tracked belt edge looks like at the tail pulley.", status: "captured", photos: 1 }),
  k({ n: 5, min: 4 * DAY, caseId: "c-416", procedureId: "pr-cnv-002", stepKey: "s1", author: "Noelia Rey", kind: "step_change", text: "Run at slow speed is not enough; jog it.", status: "rejected", reason: "Jogging with the guard open is not allowed; the slow-speed run stays." }),
  k({ n: 6, min: 90, caseId: null, procedureId: null, stepKey: null, author: "MCP: Ferrovela IT assistant", authorKind: "mcp", kind: "note", text: "CMP-01 and CMP-02 had 5 trips in 30 days; a repeat-failure review may help.", status: "captured" }),
  k({ n: 7, min: 2 * DAY, caseId: null, procedureId: "pr-mix-004", stepKey: "s2", author: "Noelia Rey", kind: "step_change", text: "The housing has a locating pin; mark its position before removing.", status: "clarify", reason: "Which side is the pin on? A photo would help." }),
];
