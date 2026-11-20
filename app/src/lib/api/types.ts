/**
 * The Field API contract (ARAXOS-FIELD.md §10–§11). Every method mirrors one OpenAPI operation; the mock
 * (`mock.ts`) and, later, the HTTP client against the Rust server implement this same interface.
 */

export type Lang = "es" | "gl" | "ca";
export type Role = "field" | "approver" | "approver_senior" | "admin" | "auditor";
export type Channel = "app" | "whatsapp";

/** The four action families of Field, each with a fixed band colour (§7.2). */
export type ActionKind = "report" | "order" | "visit" | "crm";

export type EntityType = "customer" | "product" | "asset" | "date" | "duration" | "person" | "address" | "quantity";

export type NoteState =
  | "recording" | "draft" | "needs_answer" | "ready" | "awaiting_second" | "applied" | "rejected" | "failed";

export type ActionState = "proposed" | "approved" | "rejected" | "applied" | "failed";

export type User = { id: string; name: string; initials: string; role: Role; team: string; langs: Lang[]; phone?: string; devices: number; active: boolean };

/** `transcript.v1`: words with timing, confidence and the language of each span. */
export type Word = { t: number; text: string; p: number; lang: Lang };
export type Transcript = { schema: "transcript.v1"; words: Word[]; model: string };

/** `entity.v1`: a span over the transcript words, its normalised value and grounded candidates. */
export type Candidate = { id: string; label: string; detail: string; score: number; ref?: string };
export type Entity = {
  id: string; type: EntityType; from: number; to: number; value: string;
  confidence: number; candidates: Candidate[]; chosen: string;
};

/** Provenance of a proposed value: which words it came from, or that it was inferred. */
export type Source = { entityId?: string; words?: [number, number]; inferred?: string };

export type ActionField = {
  key: string; label: string; target: string;
  before?: string; after: string; source?: Source; edited?: boolean; mono?: boolean;
};

export type QuestionOption = { id: string; label: string; detail?: string; patch?: Record<string, string>; amount?: number };
export type Question = { id: string; prompt: string; options: QuestionOption[]; answer?: string };

export type Conflict = { id: string; message: string; fix?: { label: string; field: string; value: string }; resolved?: boolean };

export type Action = {
  id: string; noteId: string; kind: ActionKind; title: string; system: string; model: string;
  op: "create" | "update"; state: ActionState; fields: ActionField[]; amount?: number;
  question?: Question; conflict?: Conflict; externalRef?: string; appliedAt?: string;
};

export type Approval = { userId: string; at: string; step: 1 | 2 };

export type Note = {
  id: string; number: number; authorId: string; channel: Channel; recordedAt: string; durationSec: number;
  langs: Lang[]; customer: string; place: string; summary: string; state: NoteState; urgent?: boolean;
  transcript: Transcript; entities: Entity[]; actions: Action[]; approvals: Approval[];
  rejectedReason?: string;
};

export type NoteSummary = Pick<Note, "id" | "number" | "authorId" | "channel" | "recordedAt" | "durationSec" | "langs" | "customer" | "place" | "summary" | "state" | "urgent"> & {
  kinds: ActionKind[]; total?: number; openQuestions: number; conflicts: number;
};

export type QueueGroup = { key: "urgent" | "today" | "earlier"; label: string; items: NoteSummary[] };

/** A computed diff against the target system (GET /v1/actions/{id}/preview). */
export type Preview = { actionId: string; computedAt: string; system: string; record: string; rows: { label: string; before?: string; after: string; changed: boolean }[] };

export type Correction =
  | { kind: "entity"; entityId: string; candidateId: string; rememberAlias?: boolean }
  | { kind: "field"; actionId: string; key: string; value: string };

export type ConnectorKind = "odoo" | "gcal" | "hubspot" | "holded" | "webhook" | "mcp";
export type Connector = {
  id: string; kind: ConnectorKind; name: string; detail: string; status: "connected" | "degraded" | "off";
  lastSync?: string; mirrors: { object: string; count: number }[]; families: ActionKind[];
};

export type SchemaField = { key: string; type: "string" | "number" | "date" | "enum" | "ref"; required: boolean; max?: number; mapsTo: string };
export type ActionType = { kind: ActionKind; name: string; version: number; description: string; policy: "review" | "auto" | "double"; fields: SchemaField[]; mappings: { connector: string; model: string }[] };

export type VocabTerm = { id: string; term: string; type: EntityType; aliases: { text: string; lang: Lang; userId?: string; learned?: boolean }[] };

/** `policy.v1`. */
export type Policy = { version: number; doubleAbove: number; undoWindowSec: number; autoKinds: ActionKind[] };

export type AuditEvent = { seq: number; at: string; actorId: string; type: string; subject: string; detail: string; hash: string; prev: string };

export type NoteDraftInput = { scenario: ScenarioId; durationSec: number };
export type ScenarioId = "javier-cantabrico" | "marta-hornos" | "talleres-perez";

export interface FieldApi {
  /** GET /v1/queue?group=urgency */
  queue(): Promise<QueueGroup[]>;
  /** GET /v1/notes?author=me&state= */
  notes(q?: { author?: string; state?: NoteState }): Promise<NoteSummary[]>;
  /** GET /v1/notes/{id} */
  note(id: string): Promise<Note>;
  /** POST /v1/notes (the app uploads a recording; the mock replays a scripted scenario) */
  createNote(input: NoteDraftInput): Promise<Note>;
  /** POST /v1/notes/{id}/answers */
  answer(noteId: string, a: { actionId: string; optionId: string }): Promise<Note>;
  /** POST /v1/notes/{id}/corrections */
  correct(noteId: string, c: Correction): Promise<Note>;
  /** POST /v1/notes/{id}/submit · /discard */
  submit(noteId: string): Promise<Note>;
  discard(noteId: string): Promise<void>;
  /** GET /v1/actions/{id}/preview */
  preview(actionId: string): Promise<Preview>;
  /** POST /v1/actions/{id}/approve (resolves a conflict with its suggested fix when `applyFix`) */
  resolveConflict(actionId: string): Promise<Note>;
  /** POST /v1/notes/{id}/approve-all */
  approveAll(noteId: string): Promise<Note>;
  /** POST /v1/actions/{id}/reject (for the whole note in the console) */
  reject(noteId: string, reason: string): Promise<Note>;
  /** POST /v1/actions/{id}/undo */
  undo(noteId: string): Promise<Note>;
  /** GET /v1/connectors · POST /v1/connectors/{id}/sync */
  connectors(): Promise<Connector[]>;
  syncConnector(id: string): Promise<Connector>;
  /** GET /v1/action-types */
  actionTypes(): Promise<ActionType[]>;
  /** GET/POST/DELETE /v1/vocab · /aliases */
  vocab(): Promise<VocabTerm[]>;
  addAlias(termId: string, alias: { text: string; lang: Lang }): Promise<VocabTerm>;
  removeAlias(termId: string, text: string): Promise<VocabTerm>;
  /** GET /v1/policy */
  policy(): Promise<Policy>;
  /** GET /v1/users */
  users(): Promise<User[]>;
  me(): Promise<User>;
  /** GET /v1/audit · /audit/verify */
  audit(): Promise<AuditEvent[]>;
  verifyAudit(): Promise<{ ok: boolean; checked: number }>;
}
