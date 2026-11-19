/**
 * The /api/v1 contract the screens use (ARAXOS.md §22). The mock implements it in memory; the HTTP client
 * will implement the same `AraxosApi` over openapi-typescript types. Dates are ISO 8601 in UTC.
 */
export type Id = string;
export type Iso = string;

/* People, places, devices --------------------------------------------------------------------- */
export type Role = "technician" | "lead" | "engineer" | "safety_approver" | "auditor" | "admin" | "viewer";
export type User = {
  id: Id; name: string; short: string; email: string; roles: Role[]; area: string; hue: number;
  totp: boolean; badge: boolean; lastSeenAt: Iso | null;
};
export type Density = "office" | "workshop" | "panel" | "wall";
export type DeviceKind = "phone" | "terminal" | "personal";
export type Device = {
  id: Id; name: string; kind: DeviceKind; area: string; line: string | null; density: Density | null;
  os: string; enrolledAt: Iso; lastSeenAt: Iso; status: "active" | "revoked"; pendingOps: number;
};
export type Me = User & { plantId: Id; groupName: string; deviceId: Id };
export type Plant = { id: Id; code: string; name: string; city: string; areas: string[]; lines: string[] };
export type Machine = {
  id: Id; plantId: Id; code: string; name: string; kind: string; area: string; line: string;
  viperCode: string | null; qr: string; openCases: number; procedures: number;
};

/* Procedures (§11) ----------------------------------------------------------------------------- */
export type StepKind = "instruction" | "measurement" | "photo" | "checklist" | "decision" | "safety";
export type Requirement = { kind: "photo" | "measurement" | "note"; label: string };
export type Cite = { doc: string; page: number; kind: "manual" | "norm"; quote: string };
export type Range = { min: number; max: number; unit: string; onOutOfRange: string };
export type LockSpec = { point: string; action: "apply" | "remove"; energy: string };
export type Branch = { label: string; to: string };
export type Step = {
  key: string; n: number; kind: StepKind; title: string; body: string; minutes: number;
  requirements: Requirement[]; cite: Cite | null; range: Range | null; lock: LockSpec | null; branches: Branch[];
};
export type VersionStatus = "draft" | "review" | "safety_review" | "approved" | "retired";
export type SignatureRole = "engineering" | "safety";
export type Signature = { role: SignatureRole; userId: Id; name: string; at: Iso; sha256: string };
export type StepComment = { stepKey: string; author: string; at: Iso; text: string };
export type ProcedureVersion = {
  id: Id; procedureId: Id; n: number; status: VersionStatus; bodySha256: string; authorId: Id; lastEditorId: Id;
  createdAt: Iso; approvedAt: Iso | null; changeNote: string; steps: Step[]; signatures: Signature[]; comments: StepComment[];
};
export type Procedure = {
  id: Id; code: string; title: string; machineKind: string; minutes: number;
  approved: number | null; draft: number | null; versions: Id[]; usedInCases: number;
};
export type DiffRow = { key: string; change: "same" | "added" | "removed" | "changed"; before: Step | null; after: Step | null };
export type DryRun = { path: string[]; ended: "end" | "blocked"; notes: string[] };

/* Cases (§4.2, §24) ---------------------------------------------------------------------------- */
export type Severity = "high" | "medium" | "low";
export type CaseStatus = "open" | "in_progress" | "blocked" | "closed";
export type Origin = "manual" | "viper_alert" | "mcp";
export type EvidenceKind = "photo" | "screen" | "file" | "measurement" | "note";
export type Evidence = {
  id: Id; kind: EvidenceKind; label: string; at: Iso; by: string; sha256: string;
  value: number | null; unit: string | null; inRange: boolean | null;
};
export type StepRun = { key: string; state: "done" | "current" | "pending" | "skipped"; at: Iso | null; by: string | null; evidence: Evidence[] };
export type CitationKind = "case" | "viper" | "knowledge" | "manual" | "procedure";
export type Citation = { kind: CitationKind; label: string; ref: string };
export type Confidence = "high" | "medium" | "low";
export type Proposal = {
  route: "fast" | "slow" | "abstain"; diagnosis: string | null; confidence: Confidence | null;
  versionId: Id | null; why: Citation[]; reason: string | null;
};
export type CaseClose = { cause: string; solution: string; parts: string[]; minutes: number; helped: "yes" | "partly" | "no"; change: string };
export type Case = {
  id: Id; code: string; plantId: Id; machineId: Id; symptom: string; severity: Severity; status: CaseStatus; origin: Origin;
  openedAt: Iso; closedAt: Iso | null; assigneeId: Id | null; line: string; area: string;
  versionId: Id | null; steps: StepRun[]; proposal: Proposal | null; pendingOps: number; close: CaseClose | null;
};
export type IncidentDraft = { machineId: Id; symptom: string; severity: Severity };

/* Safety and LOTO (§29.4) ---------------------------------------------------------------------- */
export type LockState = "applied" | "verified" | "removal_pending" | "removed";
export type Lock = {
  id: Id; caseId: Id; machineId: Id; stepKey: string; point: string; state: LockState;
  appliedBy: Id; appliedAt: Iso; appliedDevice: Id; photo: boolean;
  verifiedBy: Id | null; verifiedAt: Iso | null; verifiedDevice: Id | null;
  removedAt: Iso | null; removalVerifiedBy: Id | null; removalVerifiedAt: Iso | null;
};
export type SafetyPolicy = { mode: "dual_signature"; engineers: Id[]; safetyApprovers: Id[]; verifiers: Id[]; permitField: boolean };
export type LockApply = { caseId: Id; stepKey: string; point: string; lockId: string; photo: boolean; deviceId: Id };
export type LockVerify = { lockId: Id; scanned: string; verifierId: Id; deviceId: Id; removal: boolean };

/* Saber (§14) ---------------------------------------------------------------------------------- */
export type KnowledgeStatus = "captured" | "in_review" | "clarify" | "accepted" | "rejected";
export type KnowledgeItem = {
  id: Id; caseId: Id | null; procedureId: Id | null; stepKey: string | null; author: string; authorKind: "person" | "mcp";
  kind: "step_change" | "new_step" | "note" | "photo"; text: string; transcript: string | null; photos: number;
  status: KnowledgeStatus; reason: string | null; at: Iso; incorporatedIn: string | null;
};
export type KnowledgeAction = "incorporate" | "reject" | "clarify";

/* Authoring: interviews (E2) ------------------------------------------------------------------- */
export type Segment = { at: number; speaker: "engineer" | "expert"; text: string };
export type DraftStep = { title: string; at: number; safetyFlag: boolean };
export type Interview = {
  id: Id; expert: string; machineKind: string; consentAt: Iso; seconds: number; status: "recording" | "transcribed" | "drafted";
  segments: Segment[]; draft: DraftStep[];
};

/* KPIs and analytics (§24.14 D1, §24.18) ------------------------------------------------------- */
export type MttrPoint = { day: Iso; minutes: number; lo: number; hi: number };
export type Overview = {
  byStatus: Record<CaseStatus, number>; blocked: number; mttr: MttrPoint[]; mttrNow: number;
  repeats: { machine: string; count: number }[]; coverage: { kind: string; covered: number; total: number }[];
  knowledgeQueue: number; pendingApprovals: number; openLocks: number; mcpPending: number;
};
export type Distribution = { kind: string; p25: number; median: number; p75: number; p90: number; cases: number };
export type Friction = { procedure: string; version: number; step: string; fails: number; skips: number; minutes: number };
export type Analytics = {
  mttrByKind: Distribution[]; repeats: { machine: string; count: number; days: number }[];
  coverage: Overview["coverage"]; friction: Friction[];
  effectiveness: { procedure: string; before: number; after: number; version: number }[];
  knowledge: { week: string; captured: number; accepted: number }[];
};
export type AnalyticsFilter = { area: string; kind: string; period: "30d" | "90d" | "365d" };

/* Group hub (§24.15) --------------------------------------------------------------------------- */
export type SiteSummary = Plant & { link: "online" | "degraded" | "offline"; openCases: number; mttr: number; coverage: number; certExpires: Iso; lastSnapshotAt: Iso };
export type GroupProcedure = { code: string; title: string; adoptedBy: number; plants: number };

/* Administration (D8) -------------------------------------------------------------------------- */
export type Badge = { id: Id; userId: Id; hash: string; issuedAt: Iso; lastUsedAt: Iso | null; status: "active" | "revoked" };
export type McpToken = {
  id: Id; name: string; client: string; scopes: string[]; area: string | null; expiresAt: Iso; externalModel: boolean;
  createdBy: string; lastUsedAt: Iso | null; calls24h: number;
};
export type McpProposal = { id: Id; tokenId: Id; tool: "knowledge.propose" | "incidents.propose"; summary: string; at: Iso; status: "pending" | "approved" | "rejected" };
export type Tool = { name: string; version: string; kind: "read" | "reason"; description: string; enabled: boolean };
export type PlantSettings = { fastRouteThreshold: number; retentionDays: { evidence: number; audio: number; cases: number }; terminalLockMin: { panel: number; workshop: number } };
export type License = { plan: "Pro"; holder: string; expires: Iso; terminals: { used: number; max: number }; devices: { used: number; max: number } };

/* Audit (§21) ---------------------------------------------------------------------------------- */
export type AuditObjectKind = "session" | "case" | "step" | "procedure" | "lock" | "knowledge" | "evidence" | "mcp" | "device" | "user" | "audit";
export type AuditAction =
  | "auth.login" | "auth.badge" | "case.open" | "case.close" | "step.confirm" | "step.skip" | "procedure.submit" | "procedure.sign"
  | "procedure.approve" | "procedure.retire" | "lock.apply" | "lock.verify" | "lock.remove" | "knowledge.capture" | "knowledge.accept"
  | "knowledge.reject" | "evidence.view" | "mcp.call" | "mcp.approve" | "device.enroll" | "device.revoke" | "badge.revoke"
  | "user.role" | "threshold.change" | "audit.export";
/** One append-only audit entry. `hash` chains over `prevHash` and the entry body; anchors seal the chain daily. */
export type AuditEvent = {
  id: Id; seq: number; plantId: Id; at: Iso; actorId: Id | null; actor: string; actorKind: "person" | "mcp" | "system"; action: AuditAction;
  objectKind: AuditObjectKind; object: string; detail: string; ip: string; prevHash: string; hash: string; anchored: boolean;
};
export type AuditChain = { ok: boolean; checked: number; anchorAt: Iso; anchorHash: string; pending: number; brokenAt: number | null };
export type AuditExport = { fileName: string; entries: number; signature: string; signedBy: string; body: string };

/* Sign-in (§15.11, ADR-A39) -------------------------------------------------------------------- */
export type Terminal = { id: Id; name: string; area: string; density: Density; lastSyncAt: Iso; pendingOps: number };
export type BadgeLogin = { terminalId: Id; badge: string | null; userId: Id | null; pin: string };
export type Reauth = { userId: Id; password: string; totp: string };

/** RFC 9457 Problem Details, the only error shape (ADR-A33). `type` is the short code, e.g. `safety/self_verification`. */
export class Problem extends Error {
  constructor(readonly type: string, readonly title: string, readonly status = 409) { super(title); }
}

export type AraxosApi = {
  me(): Promise<Me>;
  users(): Promise<User[]>;
  plants(): Promise<Plant[]>;
  overview(plantId: Id): Promise<Overview>;
  machines(plantId: Id): Promise<Machine[]>;
  createMachine(m: Pick<Machine, "plantId" | "code" | "name" | "kind" | "area" | "line">): Promise<Machine>;
  cases(plantId: Id): Promise<Case[]>;
  case(id: Id): Promise<Case | null>;
  createIncident(d: IncidentDraft): Promise<Case>;
  propose(caseId: Id): Promise<Proposal>;
  accept(caseId: Id, versionId: Id | null): Promise<Case>;
  addEvidence(v: { caseId: Id; stepKey: string; evidence: Omit<Evidence, "id" | "at" | "sha256"> }): Promise<Evidence>;
  confirmStep(v: { caseId: Id; stepKey: string; choice?: string }): Promise<Case>;
  reassign(caseId: Id, userId: Id): Promise<Case>;
  closeCase(caseId: Id, close: CaseClose): Promise<Case>;
  transcribe(seconds: number): Promise<string>;
  procedures(): Promise<Procedure[]>;
  version(id: Id): Promise<ProcedureVersion | null>;
  versionsOf(procedureId: Id): Promise<ProcedureVersion[]>;
  diff(versionId: Id, againstId: Id): Promise<DiffRow[]>;
  dryRun(versionId: Id, choices: Record<string, string>): Promise<DryRun>;
  saveDraft(versionId: Id, steps: Step[], editorId: Id): Promise<ProcedureVersion>;
  submit(versionId: Id): Promise<ProcedureVersion>;
  sign(v: { versionId: Id; sha256: string; role: SignatureRole; reauth: Reauth }): Promise<ProcedureVersion>;
  returnDraft(versionId: Id, reason: string): Promise<ProcedureVersion>;
  knowledge(): Promise<KnowledgeItem[]>;
  actOnKnowledge(id: Id, action: KnowledgeAction, reason: string): Promise<KnowledgeItem>;
  captureKnowledge(v: Pick<KnowledgeItem, "caseId" | "procedureId" | "stepKey" | "text" | "kind">): Promise<KnowledgeItem>;
  safetyPolicy(): Promise<SafetyPolicy>;
  locks(plantId: Id): Promise<Lock[]>;
  applyLock(v: LockApply): Promise<Lock>;
  verifyLock(v: LockVerify): Promise<Lock>;
  requestRemoval(lockId: Id): Promise<Lock>;
  switchUser(userId: Id): Promise<Me>;
  interviews(): Promise<Interview[]>;
  analytics(plantId: Id, f: AnalyticsFilter): Promise<Analytics>;
  sites(): Promise<SiteSummary[]>;
  groupProcedures(): Promise<GroupProcedure[]>;
  devices(): Promise<Device[]>;
  revokeDevice(id: Id): Promise<Device>;
  enrollTerminal(v: { name: string; area: string; density: Density }): Promise<{ device: Device; code: string }>;
  badges(): Promise<Badge[]>;
  revokeBadge(id: Id): Promise<Badge>;
  mcpTokens(): Promise<McpToken[]>;
  mcpProposals(): Promise<McpProposal[]>;
  decideMcpProposal(id: Id, approve: boolean): Promise<McpProposal>;
  tools(): Promise<Tool[]>;
  settings(): Promise<PlantSettings>;
  setThreshold(value: number): Promise<PlantSettings>;
  license(): Promise<License>;
  audit(plantId: Id): Promise<AuditEvent[]>;
  verifyAudit(plantId: Id): Promise<AuditChain>;
  exportAudit(plantId: Id, ids: Id[]): Promise<AuditExport>;
  terminal(id: Id): Promise<Terminal>;
  login(email: string, password: string): Promise<{ needsTotp: true }>;
  verifyTotp(code: string): Promise<Me>;
  badgeLogin(v: BadgeLogin): Promise<User>;
};
