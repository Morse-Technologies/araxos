import type {
  Action, AuditEvent, Connector, Correction, FieldApi, Note, NoteSummary, Preview, QueueGroup, User, VocabTerm,
} from "./types";
import { fnv64 } from "./hash";
import { CONSOLE_ACTOR, MOBILE_ACTOR, USERS } from "./fixtures/people";
import { SCENARIOS } from "./fixtures/scenarios";
import { POLICY, SEED_AUDIT, buildActionTypes, buildConnectors, buildNotes, buildVocab } from "./fixtures/world";

/** A rule the API refuses with (HTTP 409/422 on the server). The message is shown to the person as is. */
export class ApiError extends Error {}

type World = { notes: Note[]; connectors: Connector[]; vocab: VocabTerm[]; audit: AuditEvent[]; actor: string; nextNumber: number };

let latencyMs = 220;
let world: World = fresh();

function fresh(): World {
  const w: World = { notes: buildNotes(), connectors: buildConnectors(), vocab: buildVocab(), audit: [], actor: CONSOLE_ACTOR, nextNumber: 486 };
  for (const e of SEED_AUDIT) appendAudit(w, e);
  return w;
}

function appendAudit(w: World, e: Omit<AuditEvent, "seq" | "hash" | "prev">) {
  const prev = w.audit.at(-1)?.hash ?? "0".repeat(16);
  const seq = w.audit.length + 1;
  w.audit.push({ ...e, seq, prev, hash: fnv64(`${prev}|${seq}|${e.at}|${e.actorId}|${e.type}|${e.subject}|${e.detail}`) });
}

/** Mock only: resets the demo world, sets who is acting, and the simulated network latency. */
/** Notes recorded on this phone. Demo scenarios keep their own author, but "Tus notas" should still list them. */
const recordedHere = new Set<string>();
export const resetMock = () => { world = fresh(); recordedHere.clear(); };
export const setMockActor = (userId: string) => { world.actor = userId; };
export const setMockLatency = (ms: number) => { latencyMs = ms; };

const clone = <T,>(v: T): T => structuredClone(v);
const wait = () => new Promise((r) => setTimeout(r, latencyMs));
const now = () => new Date().toISOString();

async function respond<T>(fn: () => T): Promise<T> {
  await wait();
  return clone(fn());
}

function findNote(id: string): Note {
  const n = world.notes.find((x) => x.id === id);
  if (!n) throw new ApiError("No existe esa nota.");
  return n;
}

function findAction(actionId: string): Action {
  for (const n of world.notes) {
    const a = n.actions.find((x) => x.id === actionId);
    if (a) return a;
  }
  throw new ApiError("No existe esa acción.");
}

export const noteTotal = (n: Pick<Note, "actions">) => n.actions.reduce((s, a) => s + (a.amount ?? 0), 0);
export const openQuestions = (n: Pick<Note, "actions">) => n.actions.filter((a) => a.question && !a.question.answer).length;
export const openConflicts = (n: Pick<Note, "actions">) => n.actions.filter((a) => a.conflict && !a.conflict.resolved).length;

export function summarize(n: Note): NoteSummary {
  const { id, number, authorId, channel, recordedAt, durationSec, langs, customer, place, summary, state, urgent } = n;
  const total = noteTotal(n);
  return { id, number, authorId, channel, recordedAt, durationSec, langs, customer, place, summary, state, urgent,
    kinds: [...new Set(n.actions.map((a) => a.kind))], total: total || undefined, openQuestions: openQuestions(n), conflicts: openConflicts(n) };
}

/** Decides the state a note is in after its questions change. */
function settle(n: Note) {
  if (n.state === "needs_answer" || n.state === "ready") n.state = openQuestions(n) ? "needs_answer" : "ready";
}

const QUEUE_STATES = new Set<Note["state"]>(["needs_answer", "ready", "awaiting_second"]);

function groupQueue(): QueueGroup[] {
  const live = world.notes.filter((n) => QUEUE_STATES.has(n.state)).sort((a, b) => b.number - a.number);
  const today = (n: Note) => n.recordedAt.startsWith("2026-11-20");
  const groups: QueueGroup[] = [
    { key: "urgent", label: "Urgente", items: live.filter((n) => n.urgent).map(summarize) },
    { key: "today", label: "Hoy", items: live.filter((n) => !n.urgent && today(n)).map(summarize) },
    { key: "earlier", label: "Anteriores", items: live.filter((n) => !n.urgent && !today(n)).map(summarize) },
  ];
  return groups.filter((g) => g.items.length > 0);
}

function chooseCandidate(n: Note, entityId: string, candidateId: string) {
  const e = n.entities.find((x) => x.id === entityId);
  const c = e?.candidates.find((x) => x.id === candidateId);
  if (!e || !c) throw new ApiError("Esa alternativa ya no existe.");
  e.chosen = c.id;
  e.value = c.label;
  e.confidence = Math.max(e.confidence, 0.99);
  for (const a of n.actions) for (const f of a.fields) if (f.source?.entityId === entityId) { f.after = c.label; f.edited = true; }
  return { e, c };
}

function rememberAlias(n: Note, entityId: string) {
  const e = n.entities.find((x) => x.id === entityId);
  if (!e) return;
  const spoken = n.transcript.words.slice(e.from, e.to + 1).map((w) => w.text.replace(/[.,…]/g, "")).join(" ");
  let term = world.vocab.find((v) => v.term === e.value);
  if (!term) { term = { id: `v${world.vocab.length + 1}`, term: e.value, type: e.type, aliases: [] }; world.vocab.push(term); }
  if (!term.aliases.some((a) => a.text === spoken)) term.aliases.push({ text: spoken, lang: n.transcript.words[e.from].lang, userId: n.authorId, learned: true });
}

function applyCorrection(n: Note, c: Correction) {
  if (c.kind === "entity") {
    const { e, c: cand } = chooseCandidate(n, c.entityId, c.candidateId);
    for (const a of n.actions) if (a.question && a.fields.some((f) => f.source?.entityId === e.id)) answerQuestion(a, cand.id);
    if (c.rememberAlias) rememberAlias(n, c.entityId);
    return `${e.type}: ${cand.label}${c.rememberAlias ? " · alias recordado" : ""}`;
  }
  const a = n.actions.find((x) => x.id === c.actionId);
  const f = a?.fields.find((x) => x.key === c.key);
  if (!a || !f) throw new ApiError("Ese campo ya no existe.");
  f.after = c.value;
  f.edited = true;
  return `${a.title} · ${f.label}: ${c.value}`;
}

function answerQuestion(a: Action, optionId: string) {
  const q = a.question;
  const o = q?.options.find((x) => x.id === optionId);
  if (!q || !o) throw new ApiError("Esa respuesta ya no es válida.");
  q.answer = o.id;
  for (const [key, value] of Object.entries(o.patch ?? {})) {
    const f = a.fields.find((x) => x.key === key);
    if (f) { f.after = value; f.edited = true; }
  }
  if (o.amount !== undefined) a.amount = o.amount;
}

function assertApprovable(n: Note) {
  if (!QUEUE_STATES.has(n.state)) throw new ApiError("Esta nota ya no está en la bandeja.");
  if (openQuestions(n)) throw new ApiError("Responde antes las preguntas abiertas.");
  if (openConflicts(n)) throw new ApiError("Resuelve antes el conflicto de agenda.");
}

function applyAll(n: Note) {
  n.state = "applied";
  const t = now();
  n.actions.forEach((a, i) => {
    a.state = "applied";
    a.appliedAt = t;
    a.externalRef = `${a.model}:${10200 + n.number + i}`;
  });
  appendAudit(world, { at: t, actorId: "system", type: "action.applied", subject: noteLabel(n), detail: `${n.actions.length} acciones · ${[...new Set(n.actions.map((a) => a.system))].join(", ")}` });
}

const noteLabel = (n: Note) => `N.º ${String(n.number).padStart(6, "0")}`;

function approve(n: Note) {
  assertApprovable(n);
  const needsTwo = noteTotal(n) > POLICY.doubleAbove;
  if (n.approvals.some((a) => a.userId === world.actor)) throw new ApiError("La segunda firma tiene que ser de otra persona.");
  n.approvals.push({ userId: world.actor, at: now(), step: n.approvals.length === 0 ? 1 : 2 });
  appendAudit(world, { at: now(), actorId: world.actor, type: "action.approved", subject: noteLabel(n), detail: needsTwo ? `Firma ${n.approvals.length} de 2` : `${n.actions.length} acciones` });
  if (needsTwo && n.approvals.length < 2) { n.state = "awaiting_second"; return; }
  applyAll(n);
}

function buildPreview(a: Action): Preview {
  return {
    actionId: a.id, computedAt: now(), system: a.system,
    record: a.op === "create" ? `Nuevo ${a.model}` : `${a.model} · registro existente`,
    rows: a.fields.map((f) => ({ label: f.label, before: f.before, after: f.after, changed: f.before !== f.after })),
  };
}

function me(): User {
  const u = USERS.find((x) => x.id === world.actor);
  if (!u) throw new ApiError("Sesión no válida.");
  return u;
}

export const mockApi: FieldApi = {
  queue: () => respond(groupQueue),
  notes: (q) => respond(() => world.notes
    .filter((n) => (!q?.author || n.authorId === q.author || (q.author === MOBILE_ACTOR && recordedHere.has(n.id))) && (!q?.state || n.state === q.state))
    .sort((a, b) => b.number - a.number).map(summarize)),
  note: (id) => respond(() => findNote(id)),
  createNote: (input) => respond(() => {
    const number = world.nextNumber++;
    const n = SCENARIOS[input.scenario].build({ id: `n-${number}`, number, recordedAt: now() });
    n.state = "draft";
    world.notes.push(n);
    recordedHere.add(n.id);
    appendAudit(world, { at: now(), actorId: n.authorId, type: "note.received", subject: noteLabel(n), detail: `App · ${input.durationSec} s` });
    return n;
  }),
  answer: (noteId, { actionId, optionId }) => respond(() => {
    const n = findNote(noteId);
    const a = n.actions.find((x) => x.id === actionId);
    if (!a) throw new ApiError("No existe esa acción.");
    answerQuestion(a, optionId);
    const e = n.entities.find((x) => a.fields.some((f) => f.source?.entityId === x.id) && x.candidates.some((c) => c.id === optionId) && x.type === "product");
    if (e) { e.chosen = optionId; e.value = e.candidates.find((c) => c.id === optionId)!.label; e.confidence = 0.99; }
    settle(n);
    appendAudit(world, { at: now(), actorId: world.actor, type: "note.answered", subject: noteLabel(n), detail: a.question!.options.find((o) => o.id === optionId)!.label });
    return n;
  }),
  correct: (noteId, c) => respond(() => {
    const n = findNote(noteId);
    const detail = applyCorrection(n, c);
    settle(n);
    appendAudit(world, { at: now(), actorId: world.actor, type: "note.corrected", subject: noteLabel(n), detail });
    return n;
  }),
  submit: (noteId) => respond(() => {
    const n = findNote(noteId);
    if (n.state !== "draft") throw new ApiError("Esta nota ya se envió.");
    n.state = openQuestions(n) ? "needs_answer" : "ready";
    appendAudit(world, { at: now(), actorId: n.authorId, type: "note.submitted", subject: noteLabel(n), detail: "Enviada a la oficina" });
    return n;
  }),
  discard: (noteId) => respond(() => {
    const n = findNote(noteId);
    world.notes = world.notes.filter((x) => x !== n);
    appendAudit(world, { at: now(), actorId: n.authorId, type: "note.discarded", subject: noteLabel(n), detail: "Descartada en el móvil" });
  }),
  preview: (actionId) => respond(() => buildPreview(findAction(actionId))),
  resolveConflict: (actionId) => respond(() => {
    const a = findAction(actionId);
    const k = a.conflict;
    if (!k?.fix) throw new ApiError("Este conflicto no tiene arreglo automático.");
    const f = a.fields.find((x) => x.key === k.fix!.field);
    if (f) { f.after = k.fix.value; f.edited = true; }
    k.resolved = true;
    const n = findNote(a.noteId);
    appendAudit(world, { at: now(), actorId: world.actor, type: "action.edited", subject: noteLabel(n), detail: `${a.title}: ${k.fix.value}` });
    return n;
  }),
  approveAll: (noteId) => respond(() => { const n = findNote(noteId); approve(n); return n; }),
  reject: (noteId, reason) => respond(() => {
    const n = findNote(noteId);
    if (!QUEUE_STATES.has(n.state)) throw new ApiError("Esta nota ya no está en la bandeja.");
    n.state = "rejected";
    n.rejectedReason = reason;
    n.actions.forEach((a) => { a.state = "rejected"; });
    appendAudit(world, { at: now(), actorId: world.actor, type: "note.rejected", subject: noteLabel(n), detail: reason });
    return n;
  }),
  undo: (noteId) => respond(() => {
    const n = findNote(noteId);
    if (n.state !== "applied" && n.state !== "rejected" && n.state !== "awaiting_second") throw new ApiError("No hay nada que deshacer.");
    n.state = openQuestions(n) ? "needs_answer" : "ready";
    n.approvals = [];
    n.rejectedReason = undefined;
    n.actions.forEach((a) => { a.state = "proposed"; a.appliedAt = undefined; a.externalRef = undefined; });
    appendAudit(world, { at: now(), actorId: world.actor, type: "action.undone", subject: noteLabel(n), detail: "Dentro de la ventana de deshacer" });
    return n;
  }),
  connectors: () => respond(() => world.connectors),
  syncConnector: (id) => respond(() => {
    const k = world.connectors.find((x) => x.id === id);
    if (!k) throw new ApiError("No existe ese conector.");
    if (k.status === "off") throw new ApiError("Configura el conector antes de sincronizar.");
    k.lastSync = now();
    return k;
  }),
  actionTypes: () => respond(buildActionTypes),
  vocab: () => respond(() => world.vocab),
  addAlias: (termId, alias) => respond(() => {
    const t = world.vocab.find((x) => x.id === termId);
    if (!t) throw new ApiError("No existe ese término.");
    const text = alias.text.trim();
    if (!text) throw new ApiError("Escribe el alias.");
    if (t.aliases.some((a) => a.text.toLowerCase() === text.toLowerCase())) throw new ApiError("Ese alias ya existe.");
    t.aliases.push({ text, lang: alias.lang });
    return t;
  }),
  removeAlias: (termId, text) => respond(() => {
    const t = world.vocab.find((x) => x.id === termId);
    if (!t) throw new ApiError("No existe ese término.");
    t.aliases = t.aliases.filter((a) => a.text !== text);
    return t;
  }),
  policy: () => respond(() => POLICY),
  users: () => respond(() => USERS),
  me: () => respond(me),
  audit: () => respond(() => [...world.audit].reverse()),
  verifyAudit: () => respond(() => {
    let prev = "0".repeat(16);
    for (const e of world.audit) {
      const ok = e.prev === prev && e.hash === fnv64(`${e.prev}|${e.seq}|${e.at}|${e.actorId}|${e.type}|${e.subject}|${e.detail}`);
      if (!ok) return { ok: false, checked: e.seq };
      prev = e.hash;
    }
    return { ok: true, checked: world.audit.length };
  }),
};
