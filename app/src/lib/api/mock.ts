import { MOCK_NOW } from "@/lib/clock";
import { AUDIT, appendAudit, digest, verifyChain, type AuditInput } from "./fixtures/audit";
import { CASES, KNOWLEDGE, LOCKS } from "./fixtures/cases";
import { ANALYTICS, GROUP_PROCEDURES, INTERVIEWS, LICENSE, MCP_PROPOSALS, MCP_TOKENS, SETTINGS, SITES, TOOLS, mttrSeries } from "./fixtures/catalog";
import { MACHINE_KINDS, VERSIONS, bodySha, procedureSummaries } from "./fixtures/procedures";
import { BADGES, BADGE_CODES, DEMO_PIN, DEVICES, GROUP_NAME, LAPTOP_OF, MACHINES, NORTH, PLANTS, TERMINALS, USERS, machineCode } from "./fixtures/world";
import { sha256 } from "./random";
import {
  Problem, type AraxosApi, type Case, type CaseStatus, type DiffRow, type Id, type Lock, type Machine, type Overview,
  type ProcedureVersion, type Step, type StepRun, type User,
} from "./types";

/** A short pause so loading states show the way they will against the real server. */
const LATENCY_MS = 120;
const later = <T>(value: T, ms = LATENCY_MS) => new Promise<T>((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));
const fail = (type: string, title: string, status = 409) => Promise.reject(new Problem(type, title, status));
const THINK_MS = 900;
const TRANSCRIBE_MS = 1200;
const VERIFY_MS = 900;
const nowIso = () => new Date(Math.max(Date.now(), MOCK_NOW)).toISOString();

/* The mutable world: writes change it and persist to localStorage, so two windows act as two terminals. */
export const MOCK_STORAGE_KEY = "araxos-mock-v1";
const fresh = () => structuredClone({
  actorId: "u-aruiz", cases: CASES, locks: LOCKS, versions: VERSIONS, knowledge: KNOWLEDGE, devices: DEVICES, badges: BADGES,
  mcp: MCP_PROPOSALS, settings: SETTINGS, audit: AUDIT, machines: [] as Machine[], seq: 425,
});
type Db = ReturnType<typeof fresh>;
let db: Db = fresh();
let loaded = false;

/** Reads the saved world (another window may have written it). Called on first use and on `storage` events. */
export function reloadFromStorage() {
  loaded = true;
  try { const raw = localStorage.getItem(MOCK_STORAGE_KEY); db = raw ? (JSON.parse(raw) as Db) : fresh(); } catch { db = fresh(); }
}
const w = (): Db => { if (!loaded && typeof window !== "undefined") reloadFromStorage(); return db; };
const save = () => { try { localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db)); } catch {} };
/** Demo links and screenshots open as a given person: `?as=u-pvidal` (the mock's `/auth/switch`). */
export function setMockActor(id: Id) { if (USERS.some((u) => u.id === id)) { w().actorId = id; save(); } }
export function resetMock() { db = fresh(); try { localStorage.removeItem(MOCK_STORAGE_KEY); } catch {} }

const actor = (): User => USERS.find((u) => u.id === w().actorId)!;
const me = () => ({ ...actor(), plantId: NORTH, groupName: GROUP_NAME, deviceId: LAPTOP_OF[actor().id] ?? "t-taller2" });
function audit(e: Omit<AuditInput, "at" | "actorId" | "actor">) {
  const a = actor();
  appendAudit(w().audit, NORTH, { at: nowIso(), actorId: a.id, actor: a.name, ...e });
  save();
}

const allMachines = () => [...MACHINES, ...w().machines].map((m) => ({
  ...m, openCases: w().cases.filter((c) => c.machineId === m.id && c.status !== "closed").length,
  procedures: w().versions.filter((v) => v.status === "approved" && procedureKind(v.procedureId) === m.kind).length,
}));
const procedureKind = (pid: Id) => procedureSummaries(w().versions).find((p) => p.id === pid)?.machineKind;
const findCase = (id: Id) => w().cases.find((c) => c.id === id);
const findVersion = (id: Id) => w().versions.find((v) => v.id === id);
const stepsOf = (c: Case) => (c.versionId ? findVersion(c.versionId)?.steps ?? [] : []);

/* Overview (D1) -------------------------------------------------------------------------------- */
function coverage() {
  const kinds = MACHINE_KINDS.map((kind) => ({ kind, total: allMachines().filter((m) => m.kind === kind).length }));
  return kinds.filter((k) => k.total).map((k) => ({ ...k, covered: allMachines().filter((m) => m.kind === k.kind && m.procedures > 0).length }));
}
function overview(): Overview {
  const cases = w().cases;
  const count = (s: CaseStatus) => cases.filter((c) => c.status === s).length;
  const mttr = mttrSeries(NORTH);
  return {
    byStatus: { open: count("open"), in_progress: count("in_progress"), blocked: count("blocked"), closed: count("closed") }, blocked: count("blocked"),
    mttr, mttrNow: mttr.at(-1)!.minutes, repeats: ANALYTICS.repeats.map(({ machine, count: n }) => ({ machine, count: n })), coverage: coverage(),
    knowledgeQueue: w().knowledge.filter((k) => ["captured", "in_review", "clarify"].includes(k.status)).length,
    pendingApprovals: w().versions.filter((v) => v.status === "safety_review" || v.status === "review").length,
    openLocks: w().locks.filter((l) => l.state !== "removed").length, mcpPending: w().mcp.filter((p) => p.status === "pending").length,
  };
}

/* Cases ---------------------------------------------------------------------------------------- */
function freshRuns(steps: Step[]): StepRun[] {
  return steps.map((s, i) => ({ key: s.key, state: i === 0 ? "current" : "pending", at: null, by: null, evidence: [] }));
}
function missingRequirement(c: Case, run: StepRun): string | null {
  const step = stepsOf(c).find((s) => s.key === run.key)!;
  const need = step.requirements.find((r) => !run.evidence.some((e) => (r.kind === "measurement" ? e.kind === "measurement" : r.kind === "photo" ? e.kind === "photo" || e.kind === "screen" : true)));
  return need?.label ?? null;
}
/** Moves the cursor: the chosen branch target becomes current; steps jumped over are marked skipped. */
function advance(c: Case, from: StepRun, choice?: string) {
  const steps = stepsOf(c);
  const step = steps.find((s) => s.key === from.key)!;
  const target = step.branches.find((b) => b.label === choice)?.to;
  const i = steps.indexOf(step);
  const j = target ? steps.findIndex((s) => s.key === target) : i + 1;
  c.steps.forEach((r, k) => { if (k > i && k < j) r.state = "skipped"; });
  if (c.steps[j]) c.steps[j].state = "current";
  Object.assign(from, { state: "done", at: nowIso(), by: actor().short });
  if (c.status === "open" || c.status === "blocked") c.status = "in_progress";
}
function confirmStep(v: { caseId: Id; stepKey: string; choice?: string }) {
  const c = findCase(v.caseId);
  const run = c?.steps.find((s) => s.key === v.stepKey);
  if (!c || !run || run.state !== "current") return fail("cases/step_not_current", "This step is not the current one.");
  const step = stepsOf(c).find((s) => s.key === v.stepKey)!;
  if (step.kind === "safety") return fail("safety/needs_lock", "Safety steps are confirmed through the lock and its verification.");
  const missing = missingRequirement(c, run);
  if (missing) return fail("cases/requirement_missing", `Missing: ${missing}.`, 422);
  advance(c, run, v.choice);
  audit({ action: "step.confirm", objectKind: "step", object: `${c.code} · step ${step.n}`, detail: v.choice ? `Confirmed: ${v.choice}` : "Confirmed with evidence" });
  return later(c);
}

/* LOTO (§29.4) --------------------------------------------------------------------------------- */
/** People with `safety:verify` besides every lead (§20). */
const VERIFIERS = ["u-mlosada", "u-aruiz"];
const lockOf = (id: Id) => w().locks.find((l) => l.id === id);
function applyLock(v: { caseId: Id; stepKey: string; point: string; lockId: string; photo: boolean; deviceId: Id }) {
  const c = findCase(v.caseId);
  const step = c && stepsOf(c).find((s) => s.key === v.stepKey);
  if (!c || !step?.lock) return fail("safety/not_a_lock_step", "This step has no lock.");
  if (v.point !== step.lock.point) return fail("safety/wrong_point", `This step isolates ${step.lock.point}, not ${v.point}.`, 422);
  if (!v.photo) return fail("cases/requirement_missing", "Missing: photo of the lock in place.", 422);
  if (lockOf(v.lockId) && lockOf(v.lockId)!.state !== "removed") return fail("safety/lock_in_use", `Lock ${v.lockId} is already on another point.`);
  const lock: Lock = {
    id: v.lockId, caseId: c.id, machineId: c.machineId, stepKey: v.stepKey, point: v.point, state: "applied", appliedBy: actor().id, appliedAt: nowIso(),
    appliedDevice: v.deviceId, photo: true, verifiedBy: null, verifiedAt: null, verifiedDevice: null, removedAt: null, removalVerifiedBy: null, removalVerifiedAt: null,
  };
  w().locks = [...w().locks.filter((l) => l.id !== v.lockId), lock];
  c.status = "blocked";
  audit({ action: "lock.apply", objectKind: "lock", object: `${lock.id} on ${lock.point} · ${machineCode(c.machineId)}`, detail: "Applied; waiting for a second person" });
  return later(lock);
}
function verifyProblem(l: Lock | undefined, v: { scanned: string; verifierId: Id; deviceId: Id; removal: boolean }): Problem | null {
  if (!l) return new Problem("safety/unknown_lock", "No lock with that code is registered.", 404);
  const verifier = USERS.find((u) => u.id === v.verifierId);
  if (v.verifierId === l.appliedBy) return new Problem("safety/self_verification", "You applied this lock, so you cannot verify it. Another person has to.");
  if (v.deviceId === l.appliedDevice) return new Problem("safety/same_device", "Verification has to happen on a different device from the one that applied the lock.");
  if (!verifier?.roles.includes("lead") && !VERIFIERS.includes(v.verifierId)) return new Problem("auth/forbidden", "You do not have safety:verify.", 403);
  if (v.scanned.trim().toUpperCase() !== l.id) return new Problem("safety/verification_mismatch", `The scanned lock (${v.scanned}) is not ${l.id}.`, 422);
  if (v.removal ? l.state !== "removal_pending" : l.state !== "applied") return new Problem("safety/nothing_to_verify", "This lock has nothing waiting for verification.");
  return null;
}
function verifyLock(v: { lockId: Id; scanned: string; verifierId: Id; deviceId: Id; removal: boolean }) {
  const l = lockOf(v.lockId);
  const problem = verifyProblem(l, v);
  if (problem) return Promise.reject(problem);
  const c = findCase(l!.caseId)!;
  const run = c.steps.find((s) => s.key === (v.removal ? c.steps.find((r) => r.state === "current")?.key : l!.stepKey))!;
  Object.assign(l!, v.removal ? { state: "removed", removedAt: nowIso(), removalVerifiedBy: v.verifierId, removalVerifiedAt: nowIso() } : { state: "verified", verifiedBy: v.verifierId, verifiedAt: nowIso(), verifiedDevice: v.deviceId });
  advance(c, run);
  const who = USERS.find((u) => u.id === v.verifierId)!;
  appendAudit(w().audit, NORTH, { at: nowIso(), actorId: who.id, actor: who.name, action: v.removal ? "lock.remove" : "lock.verify", objectKind: "lock", object: l!.id, detail: `${v.removal ? "Removal" : "Lock"} verified on ${v.deviceId}` });
  save();
  return later(l!);
}
function requestRemoval(lockId: Id) {
  const l = lockOf(lockId);
  if (!l || l.state !== "verified") return fail("safety/nothing_to_remove", "This lock is not verified in place.");
  l.state = "removal_pending";
  const c = findCase(l.caseId)!;
  c.status = "blocked";
  audit({ action: "lock.remove", objectKind: "lock", object: l.id, detail: "Removal requested; waiting for a second person" });
  return later(l);
}

/* Procedures: drafts, diff, dry run and the double signature ---------------------------------- */
function diff(versionId: Id, againstId: Id): DiffRow[] {
  const a = findVersion(againstId)?.steps ?? [];
  const b = findVersion(versionId)?.steps ?? [];
  const keys = [...new Set([...a.map((s) => s.key), ...b.map((s) => s.key)])];
  return keys.map((key) => {
    const before = a.find((s) => s.key === key) ?? null, after = b.find((s) => s.key === key) ?? null;
    const change = !before ? "added" : !after ? "removed" : JSON.stringify(before) === JSON.stringify(after) ? "same" : "changed";
    return { key, change, before, after };
  });
}
function dryRun(versionId: Id, choices: Record<string, string>) {
  const steps = findVersion(versionId)?.steps ?? [];
  const path: string[] = [];
  const notes: string[] = [];
  for (let i = 0; i < steps.length && path.length <= steps.length;) {
    const s = steps[i];
    path.push(s.key);
    if (s.kind === "safety") notes.push(`Step ${s.n} needs a lock on ${s.lock?.point} and a second person.`);
    const to = s.branches.length ? s.branches.find((b) => b.label === choices[s.key])?.to ?? s.branches[0].to : null;
    i = to ? steps.findIndex((x) => x.key === to) : i + 1;
  }
  return { path, ended: "end" as const, notes };
}
function saveDraft(versionId: Id, steps: Step[], editorId: Id) {
  const v = findVersion(versionId);
  if (!v || v.status === "approved" || v.status === "retired") return fail("procedures/not_editable", "Only drafts can be edited.");
  const wasInReview = v.status === "review" || v.status === "safety_review";
  const dropped = v.signatures.map((s) => `${s.name} (${s.role})`);
  Object.assign(v, { steps: steps.map((s, i) => ({ ...s, n: i + 1 })), lastEditorId: editorId, signatures: [], status: "draft" });
  v.bodySha256 = bodySha(v.steps);
  if (wasInReview) audit({
    action: "procedure.edit", objectKind: "procedure", object: versionLabel(v),
    detail: dropped.length ? `Edited in review: the hash changed, back to draft, signatures invalidated: ${dropped.join(", ")}` : "Edited in review: the hash changed, back to draft",
  });
  save();
  return later(v);
}
const versionLabel = (v: ProcedureVersion) => `${procedureSummaries(w().versions).find((p) => p.id === v.procedureId)?.code} v${v.n}`;
function submit(versionId: Id) {
  const v = findVersion(versionId);
  if (!v || v.status !== "draft") return fail("procedures/not_draft", "Only a draft can be sent to review.");
  v.status = v.steps.some((s) => s.kind === "safety") ? "safety_review" : "review";
  audit({ action: "procedure.submit", objectKind: "procedure", object: versionLabel(v), detail: `Sent to ${v.status === "safety_review" ? "safety review (two signatures)" : "review"}; sha256 ${v.bodySha256.slice(0, 8)}` });
  return later(v);
}
function signProblem(v: ProcedureVersion | undefined, x: { sha256: string; role: "engineering" | "safety"; reauth: { userId: Id; password: string; totp: string } }): Problem | null {
  if (!v || (v.status !== "safety_review" && v.status !== "review")) return new Problem("procedures/not_in_review", "This version is not waiting for signatures.");
  if (!x.reauth.password || !/^\d{6}$/.test(x.reauth.totp) || x.reauth.totp === "000000") return new Problem("auth/reauth_failed", "Password or code not accepted. Try again.", 401);
  if (x.sha256 !== v.bodySha256) return new Problem("procedures/hash_mismatch", "The version changed while you were reading it. Reload and review again.");
  const signer = USERS.find((u) => u.id === x.reauth.userId)!;
  if (!signer.roles.includes(x.role === "engineering" ? "engineer" : "safety_approver")) return new Problem("auth/forbidden", `Only ${x.role === "engineering" ? "an engineer" : "a safety approver"} can give this signature.`, 403);
  if (signer.id === v.lastEditorId) return new Problem("safety/author_cannot_sign", "You made the last change to this draft, so you cannot sign it.");
  if (v.signatures.some((s) => s.userId === signer.id)) return new Problem("safety/same_person", "You already signed this version. The other signature has to come from a different person.");
  if (v.signatures.some((s) => s.role === x.role)) return new Problem("procedures/already_signed", "This signature is already given.");
  return null;
}
function sign(x: { versionId: Id; sha256: string; role: "engineering" | "safety"; reauth: { userId: Id; password: string; totp: string } }) {
  const v = findVersion(x.versionId);
  const problem = signProblem(v, x);
  if (problem) return Promise.reject(problem);
  const signer = USERS.find((u) => u.id === x.reauth.userId)!;
  v!.signatures.push({ role: x.role, userId: signer.id, name: signer.name, at: nowIso(), sha256: v!.bodySha256 });
  audit({ action: "procedure.sign", objectKind: "procedure", object: versionLabel(v!), detail: `${x.role === "engineering" ? "Engineering" : "Safety"} signature on sha256 ${v!.bodySha256.slice(0, 8)}` });
  const needed = v!.status === "safety_review" ? 2 : 1;
  if (v!.signatures.length >= needed) approve(v!);
  return later(v!, VERIFY_MS);
}
function approve(v: ProcedureVersion) {
  w().versions.filter((o) => o.procedureId === v.procedureId && o.status === "approved").forEach((o) => { o.status = "retired"; });
  Object.assign(v, { status: "approved", approvedAt: nowIso() });
  audit({ action: "procedure.approve", objectKind: "procedure", object: versionLabel(v), detail: `Approved with ${v.signatures.length} of ${v.signatures.length} signatures on the same hash` });
}

/* Incidents and the engine -------------------------------------------------------------------- */
function propose(caseId: Id) {
  const c = findCase(caseId)!;
  const m = allMachines().find((x) => x.id === c.machineId)!;
  const approved = w().versions.find((v) => v.status === "approved" && procedureKind(v.procedureId) === m.kind);
  c.proposal = approved
    ? { route: "slow", diagnosis: m.kind === "Extruder" ? "Drive-end bearing wear" : "Wear on a routine part", confidence: "medium", versionId: approved.id,
        why: [{ kind: "case", label: "CASE-2026-00377 (similar)", ref: "c-377" }, { kind: "manual", label: "Reducer R-200 manual, p. 112", ref: "R-200#112" }], reason: null }
    : { route: "abstain", diagnosis: null, confidence: null, versionId: null, why: [], reason: `No approved procedure covers this on a ${m.kind.toLowerCase()} yet.` };
  save();
  return later(c.proposal, THINK_MS);
}
function accept(caseId: Id, versionId: Id | null) {
  const c = findCase(caseId)!;
  Object.assign(c, { versionId, steps: versionId ? freshRuns(findVersion(versionId)!.steps) : [], status: versionId ? "in_progress" : "open", assigneeId: c.assigneeId ?? actor().id });
  save();
  return later(c);
}
function createIncident(d: { machineId: Id; symptom: string; severity: Case["severity"] }) {
  const m = allMachines().find((x) => x.id === d.machineId)!;
  const n = w().seq++;
  const c: Case = {
    id: `c-${n}`, code: `CASE-2026-00${n}`, plantId: NORTH, machineId: m.id, symptom: d.symptom, severity: d.severity, status: "open", origin: "manual",
    openedAt: nowIso(), closedAt: null, assigneeId: actor().id, line: m.line, area: m.area, versionId: null, steps: [], proposal: null, pendingOps: 0, close: null,
  };
  w().cases.unshift(c);
  audit({ action: "case.open", objectKind: "case", object: `${c.code} · ${m.code}`, detail: "Manual incident" });
  return later(c);
}
function closeCase(caseId: Id, close: Case["close"]) {
  const c = findCase(caseId)!;
  const open = w().locks.filter((l) => l.caseId === caseId && l.state !== "removed");
  if (open.length) return fail("safety/open_locks", `Locks still on: ${open.map((l) => `${l.id} on ${l.point}`).join(", ")}. Remove them first.`);
  Object.assign(c, { status: "closed", closedAt: nowIso(), close });
  audit({ action: "case.close", objectKind: "case", object: c.code, detail: `Closed in ${close?.minutes} min` });
  return later(c);
}
function addEvidence(v: { caseId: Id; stepKey: string; evidence: Omit<Case["steps"][number]["evidence"][number], "id" | "at" | "sha256"> }) {
  const run = findCase(v.caseId)?.steps.find((s) => s.key === v.stepKey);
  if (!run) return fail("cases/unknown_step", "Unknown step.", 404);
  const id = `e-${Date.now().toString(36)}`;
  const e = { ...v.evidence, id, at: nowIso(), sha256: sha256(id) };
  run.evidence.push(e);
  save();
  return later(e);
}

const DICTATION = "The cover gasket was split; I replaced it with a 3 mm one from the store.";
const TERMINAL_CODE_LEN = 8;

export const mockApi: AraxosApi = {
  me: () => later(me()),
  switchUser: (userId) => { w().actorId = userId; save(); return later(me()); },
  users: () => later(USERS),
  plants: () => later(PLANTS),
  overview: () => later(overview()),
  machines: () => later(allMachines()),
  createMachine: (m) => { const x: Machine = { ...m, id: `m-${m.code.toLowerCase()}`, viperCode: null, qr: `araxos://m/${m.code}`, openCases: 0, procedures: 0 }; w().machines.push(x); save(); return later(x); },
  cases: () => later(w().cases),
  case: (id) => later(findCase(id) ?? null),
  createIncident,
  propose,
  accept,
  addEvidence,
  confirmStep,
  reassign: (caseId, userId) => { const c = findCase(caseId)!; c.assigneeId = userId; save(); return later(c); },
  closeCase,
  transcribe: () => later(DICTATION, TRANSCRIBE_MS),
  procedures: () => later(procedureSummaries(w().versions)),
  version: (id) => later(findVersion(id) ?? null),
  versionsOf: (pid) => later(w().versions.filter((v) => v.procedureId === pid).sort((a, b) => b.n - a.n)),
  diff: (id, against) => later(diff(id, against)),
  dryRun: (id, choices) => later(dryRun(id, choices), THINK_MS),
  createDraft: (fromId, authorId) => {
    const from = findVersion(fromId);
    if (!from) return fail("procedures/unknown_version", "Unknown version.", 404);
    const open = w().versions.find((x) => x.procedureId === from.procedureId && ["draft", "review", "safety_review"].includes(x.status));
    if (open) return fail("procedures/draft_exists", `v${open.n} is already open for this procedure.`);
    const n = Math.max(...w().versions.filter((x) => x.procedureId === from.procedureId).map((x) => x.n)) + 1;
    const v: ProcedureVersion = { ...structuredClone(from), id: `${from.id.replace(/-\d+$/, "")}-${n}`, n, status: "draft", authorId, lastEditorId: authorId, createdAt: nowIso(), approvedAt: null, changeNote: "", signatures: [], comments: [] };
    w().versions.push(v);
    save();
    return later(v);
  },
  saveDraft,
  comment: (id, stepKey, text) => {
    const v = findVersion(id)!;
    v.comments.push({ stepKey, author: actor().name, at: nowIso(), text });
    save();
    return later(v);
  },
  submit,
  sign,
  returnDraft: (id, reason) => {
    const v = findVersion(id)!;
    Object.assign(v, { status: "draft", signatures: [] });
    v.comments.push({ stepKey: "", author: actor().name, at: nowIso(), text: reason });
    save();
    return later(v);
  },
  knowledge: () => later(w().knowledge),
  actOnKnowledge: (id, action, reason) => {
    const k = w().knowledge.find((x) => x.id === id)!;
    Object.assign(k, { status: action === "incorporate" ? "accepted" : action === "reject" ? "rejected" : "clarify", reason: reason || null, incorporatedIn: action === "incorporate" ? "next draft" : null });
    audit({ action: action === "reject" ? "knowledge.reject" : "knowledge.accept", objectKind: "knowledge", object: `Saber item · ${k.author}`, detail: reason || action });
    return later(k);
  },
  captureKnowledge: (x) => {
    const k = { ...x, id: `k-${Date.now().toString(36)}`, at: nowIso(), author: actor().name, authorKind: "person" as const, transcript: null, photos: 0, status: "captured" as const, reason: null, incorporatedIn: null };
    w().knowledge.unshift(k);
    audit({ action: "knowledge.capture", objectKind: "knowledge", object: "Saber item", detail: x.text.slice(0, 60) });
    return later(k);
  },
  safetyPolicy: () => later({ mode: "dual_signature" as const, engineers: ["u-aruiz", "u-lferreiro"], safetyApprovers: ["u-pvidal"], verifiers: VERIFIERS, permitField: false }),
  locks: () => later(w().locks),
  applyLock,
  verifyLock,
  requestRemoval,
  interviews: () => later(INTERVIEWS),
  analytics: () => later({ ...ANALYTICS, coverage: coverage() }),
  sites: () => later(SITES),
  groupProcedures: () => later(GROUP_PROCEDURES),
  devices: () => later(w().devices),
  revokeDevice: (id) => { const d = w().devices.find((x) => x.id === id)!; d.status = "revoked"; audit({ action: "device.revoke", objectKind: "device", object: d.name, detail: "Revoked" }); return later(d); },
  enrollTerminal: (v) => {
    const d = { id: `t-${Date.now().toString(36)}`, name: v.name, kind: "terminal" as const, area: v.area, line: null, density: v.density, os: "Waiting for first sign-in", enrolledAt: nowIso(), lastSeenAt: nowIso(), status: "active" as const, pendingOps: 0 };
    w().devices.unshift(d);
    audit({ action: "device.enroll", objectKind: "device", object: v.name, detail: "Terminal enrolment code issued" });
    return later({ device: d, code: digest(v.name).slice(0, TERMINAL_CODE_LEN).toUpperCase() });
  },
  badges: () => later(w().badges),
  revokeBadge: (id) => { const b = w().badges.find((x) => x.id === id)!; b.status = "revoked"; audit({ action: "badge.revoke", objectKind: "user", object: USERS.find((u) => u.id === b.userId)!.name, detail: "Badge revoked" }); return later(b); },
  mcpTokens: () => later(MCP_TOKENS),
  mcpProposals: () => later(w().mcp),
  decideMcpProposal: (id, ok) => { const p = w().mcp.find((x) => x.id === id)!; p.status = ok ? "approved" : "rejected"; audit({ action: "mcp.approve", objectKind: "mcp", object: p.tool, detail: ok ? "Guarded write approved" : "Guarded write rejected" }); return later(p); },
  tools: () => later(TOOLS),
  settings: () => later(w().settings),
  setThreshold: (value) => { const before = w().settings.fastRouteThreshold; w().settings.fastRouteThreshold = value; audit({ action: "threshold.change", objectKind: "case", object: "Fast route threshold", detail: `${before.toFixed(2)} → ${value.toFixed(2)}` }); return later(w().settings); },
  license: () => later(LICENSE),
  audit: () => later(w().audit.slice().reverse()),
  verifyAudit: () => later(verifyChain(w().audit), VERIFY_MS),
  exportAudit: (plantId, ids) => {
    const rows = w().audit.filter((e) => ids.includes(e.id));
    const body = JSON.stringify(rows, null, 2);
    return later({ fileName: `araxos-audit-${plantId}-${new Date(MOCK_NOW).toISOString().slice(0, 10)}.json`, entries: rows.length, body, signature: `ed25519:${digest(body)}${digest(`${body}sig`)}`, signedBy: "North Plant server key (mock)" });
  },
  terminal: (id) => later(TERMINALS.find((t) => t.id === id) ?? TERMINALS[0]),
  login: () => later({ needsTotp: true as const }),
  verifyTotp: () => later(me()),
  badgeLogin: (v) => {
    const userId = v.badge ? BADGE_CODES[v.badge.trim().toUpperCase()] : v.userId;
    const u = USERS.find((x) => x.id === userId);
    if (!u) return fail("auth/unknown_badge", "This badge is not registered here. Ask an administrator.", 401);
    if (v.pin !== DEMO_PIN) return fail("auth/bad_pin", "Wrong PIN. Try again.", 401);
    appendAudit(w().audit, NORTH, { at: nowIso(), actorId: u.id, actor: u.name, action: "auth.badge", objectKind: "session", object: TERMINALS.find((t) => t.id === v.terminalId)?.name ?? v.terminalId, detail: "Badge and PIN" });
    save();
    return later(u);
  },
};
