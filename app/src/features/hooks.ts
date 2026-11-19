"use client";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { api, type AnalyticsFilter, type CaseClose, type Density, type Evidence, type Id, type IncidentDraft, type KnowledgeAction, type KnowledgeItem, type LockApply, type LockVerify, type Reauth, type SignatureRole, type Step } from "@/lib/api";

/** Araxos runs one plant per server; the group hub reads the others through federation (§18). */
export const PLANT_ID = "pl-north";

export const useMe = () => useQuery({ queryKey: ["me"], queryFn: api.me });
export const useUsers = () => useQuery({ queryKey: ["users"], queryFn: api.users, staleTime: Infinity });
export const usePlants = () => useQuery({ queryKey: ["plants"], queryFn: api.plants, staleTime: Infinity });
export const useOverview = () => useQuery({ queryKey: ["overview"], queryFn: () => api.overview(PLANT_ID) });
export const useMachines = () => useQuery({ queryKey: ["machines"], queryFn: () => api.machines(PLANT_ID) });
export const useCases = () => useQuery({ queryKey: ["cases"], queryFn: () => api.cases(PLANT_ID) });
export const useCase = (id: Id | null) => useQuery({ queryKey: ["case", id], queryFn: () => api.case(id!), enabled: !!id });
export const useProcedures = () => useQuery({ queryKey: ["procedures"], queryFn: api.procedures });
export const useVersion = (id: Id | null) => useQuery({ queryKey: ["version", id], queryFn: () => api.version(id!), enabled: !!id });
export const useVersionsOf = (id: Id | null) => useQuery({ queryKey: ["versions", id], queryFn: () => api.versionsOf(id!), enabled: !!id });
export const useDiff = (id: Id | null, against: Id | null) =>
  useQuery({ queryKey: ["diff", id, against], queryFn: () => api.diff(id!, against!), enabled: !!id && !!against });
export const useKnowledge = () => useQuery({ queryKey: ["knowledge"], queryFn: api.knowledge });
export const useSafetyPolicy = () => useQuery({ queryKey: ["policy"], queryFn: api.safetyPolicy });
export const useLocks = () => useQuery({ queryKey: ["locks"], queryFn: () => api.locks(PLANT_ID) });
export const useInterviews = () => useQuery({ queryKey: ["interviews"], queryFn: api.interviews });
export const useAnalytics = (f: AnalyticsFilter) => useQuery({ queryKey: ["analytics", f], queryFn: () => api.analytics(PLANT_ID, f) });
export const useSites = () => useQuery({ queryKey: ["sites"], queryFn: api.sites });
export const useGroupProcedures = () => useQuery({ queryKey: ["group-procedures"], queryFn: api.groupProcedures });
export const useDevices = () => useQuery({ queryKey: ["devices"], queryFn: api.devices });
export const useBadges = () => useQuery({ queryKey: ["badges"], queryFn: api.badges });
export const useMcpTokens = () => useQuery({ queryKey: ["mcp-tokens"], queryFn: api.mcpTokens });
export const useMcpProposals = () => useQuery({ queryKey: ["mcp-proposals"], queryFn: api.mcpProposals });
export const useTools = () => useQuery({ queryKey: ["tools"], queryFn: api.tools });
export const useSettings = () => useQuery({ queryKey: ["settings"], queryFn: api.settings });
export const useLicense = () => useQuery({ queryKey: ["license"], queryFn: api.license });
export const useAudit = () => useQuery({ queryKey: ["audit"], queryFn: () => api.audit(PLANT_ID) });
export const useTerminal = (id: Id) => useQuery({ queryKey: ["terminal", id], queryFn: () => api.terminal(id) });

/** Every write refreshes the views it can change; the audit log always, because every write is audited. */
function useWrite<V, R>(write: (v: V) => Promise<R>, keys: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: () => Promise.all([...keys, "audit", "overview"].map((k) => qc.invalidateQueries({ queryKey: [k] as QueryKey }))),
  });
}
const CASE_KEYS = ["cases", "case", "locks", "machines"];

export const useSwitchUser = () => useWrite((id: Id) => api.switchUser(id), ["me"]);
export const useCreateIncident = () => useWrite((d: IncidentDraft) => api.createIncident(d), CASE_KEYS);
export const usePropose = () => useWrite((caseId: Id) => api.propose(caseId), CASE_KEYS);
export const useAccept = () => useWrite((v: { caseId: Id; versionId: Id | null }) => api.accept(v.caseId, v.versionId), CASE_KEYS);
export const useAddEvidence = () => useWrite((v: { caseId: Id; stepKey: string; evidence: Omit<Evidence, "id" | "at" | "sha256"> }) => api.addEvidence(v), CASE_KEYS);
export const useConfirmStep = () => useWrite((v: { caseId: Id; stepKey: string; choice?: string }) => api.confirmStep(v), CASE_KEYS);
export const useReassign = () => useWrite((v: { caseId: Id; userId: Id }) => api.reassign(v.caseId, v.userId), CASE_KEYS);
export const useCloseCase = () => useWrite((v: { caseId: Id; close: CaseClose }) => api.closeCase(v.caseId, v.close), CASE_KEYS);
export const useTranscribe = () => useMutation({ mutationFn: (seconds: number) => api.transcribe(seconds) });
export const useApplyLock = () => useWrite((v: LockApply) => api.applyLock(v), CASE_KEYS);
export const useVerifyLock = () => useWrite((v: LockVerify) => api.verifyLock(v), CASE_KEYS);
export const useRequestRemoval = () => useWrite((lockId: Id) => api.requestRemoval(lockId), CASE_KEYS);

const PROC_KEYS = ["procedures", "version", "versions", "diff", "machines"];
export const useSaveDraft = () => useWrite((v: { versionId: Id; steps: Step[]; editorId: Id }) => api.saveDraft(v.versionId, v.steps, v.editorId), PROC_KEYS);
export const useSubmit = () => useWrite((id: Id) => api.submit(id), PROC_KEYS);
export const useSign = () => useWrite((v: { versionId: Id; sha256: string; role: SignatureRole; reauth: Reauth }) => api.sign(v), PROC_KEYS);
export const useReturnDraft = () => useWrite((v: { versionId: Id; reason: string }) => api.returnDraft(v.versionId, v.reason), PROC_KEYS);
export const useDryRun = () => useMutation({ mutationFn: (v: { versionId: Id; choices: Record<string, string> }) => api.dryRun(v.versionId, v.choices) });

export const useActOnKnowledge = () => useWrite((v: { id: Id; action: KnowledgeAction; reason: string }) => api.actOnKnowledge(v.id, v.action, v.reason), ["knowledge"]);
export const useCaptureKnowledge = () => useWrite((v: Pick<KnowledgeItem, "caseId" | "procedureId" | "stepKey" | "text" | "kind">) => api.captureKnowledge(v), ["knowledge"]);
export const useCreateMachine = () => useWrite((m: Parameters<typeof api.createMachine>[0]) => api.createMachine(m), ["machines"]);
export const useRevokeDevice = () => useWrite((id: Id) => api.revokeDevice(id), ["devices"]);
export const useEnrollTerminal = () => useWrite((v: { name: string; area: string; density: Density }) => api.enrollTerminal(v), ["devices"]);
export const useRevokeBadge = () => useWrite((id: Id) => api.revokeBadge(id), ["badges"]);
export const useDecideMcp = () => useWrite((v: { id: Id; approve: boolean }) => api.decideMcpProposal(v.id, v.approve), ["mcp-proposals", "knowledge"]);
export const useSetThreshold = () => useWrite((v: number) => api.setThreshold(v), ["settings"]);
export const useVerifyAudit = () => useMutation({ mutationFn: () => api.verifyAudit(PLANT_ID) });
export const useExportAudit = () => useMutation({ mutationFn: (ids: Id[]) => api.exportAudit(PLANT_ID, ids) });
export const useBadgeLogin = () => useMutation({ mutationFn: (v: Parameters<typeof api.badgeLogin>[0]) => api.badgeLogin(v) });
