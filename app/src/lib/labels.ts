import type {
  AuditAction, AuditObjectKind, CaseStatus, CitationKind, Confidence, Density, DeviceKind, EvidenceKind, KnowledgeStatus, LockState, Origin, Role, Severity, StepKind, VersionStatus,
} from "@/lib/api/types";

/** Words people read. No screen shows an internal key where a text exists here. No JSX (§23.8). */

export const roleInfo: Record<Role, { label: string; help: string }> = {
  technician: { label: "Technician", help: "Opens and runs cases in their area, confirms steps, adds evidence and Saber." },
  lead: { label: "Shift lead", help: "Runs the queue, reassigns and verifies lockouts as the second person." },
  engineer: { label: "Engineer", help: "Writes procedures, reviews Saber and gives the engineering signature." },
  safety_approver: { label: "Safety approver", help: "Gives the safety signature and is the only one who can retire safety procedures." },
  auditor: { label: "Auditor", help: "Reads the audit log and evidence. Changes nothing." },
  admin: { label: "Administrator", help: "People, devices, terminals, badges, MCP tokens and retention." },
  viewer: { label: "KPI viewer", help: "Aggregated dashboards only, never per person." },
};

export const severityLabel: Record<Severity, string> = { high: "High", medium: "Medium", low: "Low" };
export const SEVERITY_ORDER: Severity[] = ["high", "medium", "low"];
export const confidenceLabel: Record<Confidence, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

export const caseStatusLabel: Record<CaseStatus, string> = { open: "Open", in_progress: "In progress", blocked: "Blocked", closed: "Closed" };
export const originLabel: Record<Origin, string> = { manual: "Manual incident", viper_alert: "Viper alert", mcp: "MCP proposal" };
export const routeLabel = { fast: "Fast route", slow: "Slow route", abstain: "No approved source" } as const;

export const stepKindLabel: Record<StepKind, string> = {
  instruction: "Instruction", measurement: "Measurement", photo: "Photo", checklist: "Checklist", decision: "Decision", safety: "Safety",
};
export const versionStatusLabel: Record<VersionStatus, string> = {
  draft: "Draft", review: "In review", safety_review: "Safety review", approved: "Approved", retired: "Retired",
};
export const lockStateLabel: Record<LockState, string> = {
  applied: "Waiting for verification", verified: "On, verified", removal_pending: "Removal waiting for verification", removed: "Removed",
};
export const evidenceKindLabel: Record<EvidenceKind, string> = { photo: "Photo", screen: "Screen capture", file: "File", measurement: "Measurement", note: "Note" };
export const citationKindLabel: Record<CitationKind, string> = { case: "Earlier case", viper: "Viper alert", knowledge: "Saber", manual: "Manual", procedure: "Procedure" };
export const knowledgeStatusLabel: Record<KnowledgeStatus, string> = {
  captured: "New", in_review: "In review", clarify: "Asked to clarify", accepted: "Incorporated", rejected: "Not taken",
};
export const knowledgeKindLabel = { step_change: "Change to a step", new_step: "New step", note: "Note", photo: "\u201cThis is how it should look\u201d" } as const;

export const densityInfo: Record<Density, { label: string; help: string }> = {
  office: { label: "Office", help: "Atlas's density, for review, authoring and audit." },
  workshop: { label: "Workshop", help: "A shop or control-room PC at about a metre: larger type, 48 px controls." },
  panel: { label: "Panel PC", help: "Gloved touch: 56 px controls and a 64 px main action." },
  wall: { label: "Wall", help: "The room display: read-only, read from three to five metres." },
};
export const deviceKindLabel: Record<DeviceKind, string> = { phone: "Phone", terminal: "Shared terminal", personal: "Personal computer" };

export const auditActionLabel: Record<AuditAction, string> = {
  "auth.login": "Signed in", "auth.badge": "Badge sign-in", "case.open": "Opened case", "case.close": "Closed case", "step.confirm": "Confirmed step",
  "step.skip": "Skipped step", "procedure.edit": "Edited version in review", "procedure.submit": "Sent to review", "procedure.sign": "Signed version", "procedure.approve": "Approved version",
  "procedure.retire": "Retired version", "lock.apply": "Applied lock", "lock.verify": "Verified lock", "lock.remove": "Removed lock",
  "knowledge.capture": "Captured Saber", "knowledge.accept": "Took Saber", "knowledge.reject": "Declined Saber", "evidence.view": "Viewed evidence",
  "mcp.call": "MCP call", "mcp.approve": "Decided MCP proposal", "device.enroll": "Enrolled device", "device.revoke": "Revoked device",
  "badge.revoke": "Revoked badge", "user.role": "Changed role", "threshold.change": "Changed threshold", "audit.export": "Exported audit",
};
export const auditObjectLabel: Record<AuditObjectKind, string> = {
  session: "Session", case: "Case", step: "Step", procedure: "Procedure", lock: "Lock", knowledge: "Saber", evidence: "Evidence",
  mcp: "MCP", device: "Device", user: "Person", audit: "Audit log",
};

/** The engine's honest voice when it has nothing approved (§23.8). */
export const ABSTAIN_TEXT = "I don't have an approved procedure for this. You can record what you do and engineering will review it.";
export const ENGINE_DOWN_TEXT = "I can't propose anything right now. You can pick a procedure or work without one.";
