import { hash, seeded } from "../random";
import type { Analytics, GroupProcedure, Interview, License, McpProposal, McpToken, MttrPoint, PlantSettings, SiteSummary, Tool } from "../types";
import { DAY, PLANTS, ago } from "./world";

export const INTERVIEWS: Interview[] = [{
  id: "iv-1", expert: "José Pérez", machineKind: "Pelletiser", consentAt: ago(12 * 60 + 2), seconds: 751, status: "recording",
  segments: [
    { at: 12, speaker: "engineer", text: "When the hopper blocks, what is the first thing you do?" },
    { at: 134, speaker: "expert", text: "First I stop the line from the HMI, never from the local button, so the cutter brakes properly." },
    { at: 205, speaker: "expert", text: "Then the feeder and the cutter both get a lock. Two locks, always." },
    { at: 220, speaker: "expert", text: "And I take out fuse F3 so nobody restarts the vibrator by mistake." },
    { at: 302, speaker: "expert", text: "Clearance under the grid you check with the gauge, 0.2 at most, otherwise it bridges again." },
    { at: 388, speaker: "expert", text: "Use the nylon rod, the metal one scratches the throat and the pellets start sticking." },
    { at: 465, speaker: "engineer", text: "What should someone new never do?" },
    { at: 471, speaker: "expert", text: "Put a hand below the grid. Even locked out, the knives can turn by inertia." },
  ],
  draft: [
    { title: "Stop the line from the HMI", at: 134, safetyFlag: false },
    { title: "Possible safety step: \u201ctake out fuse F3\u201d", at: 220, safetyFlag: true },
    { title: "Check grid clearance with the feeler gauge", at: 302, safetyFlag: false },
    { title: "Clear the throat with the nylon rod", at: 388, safetyFlag: false },
  ],
}];

export const MCP_TOKENS: McpToken[] = [
  { id: "tok-1", name: "IT assistant (on-prem model)", client: "Ferrovela IT assistant", scopes: ["araxos:cases:read", "araxos:procedures:read", "araxos:kpi:read", "araxos:knowledge:propose"], area: null, expiresAt: ago(-80 * DAY), externalModel: false, createdBy: "Iván Otero", lastUsedAt: ago(90), calls24h: 214 },
  { id: "tok-2", name: "Shift report automation", client: "n8n (plant network)", scopes: ["araxos:cases:read", "araxos:machines:read"], area: "Extrusion", expiresAt: ago(-12 * DAY), externalModel: false, createdBy: "Iván Otero", lastUsedAt: ago(14 * 60), calls24h: 36 },
  { id: "tok-3", name: "Group analytics (cloud model)", client: "Group data team", scopes: ["araxos:kpi:read", "araxos:incidents:propose"], area: null, expiresAt: ago(-30 * DAY), externalModel: true, createdBy: "Iván Otero", lastUsedAt: ago(3 * DAY), calls24h: 0 },
];
export const MCP_PROPOSALS: McpProposal[] = [
  { id: "mp-1", tokenId: "tok-1", tool: "knowledge.propose", summary: "CMP-01 and CMP-02 had 5 trips in 30 days; suggest a repeat-failure review.", at: ago(90), status: "pending" },
  { id: "mp-2", tokenId: "tok-3", tool: "incidents.propose", summary: "Draft incident: GRB-02 oil temperature trend up 8 °C over 14 days.", at: ago(3 * DAY), status: "pending" },
  { id: "mp-3", tokenId: "tok-1", tool: "knowledge.propose", summary: "Add the dryer purge valve to the leak survey route.", at: ago(5 * DAY), status: "rejected" },
];

export const TOOLS: Tool[] = [
  { name: "cases.search", version: "1.2.0", kind: "read", description: "Similar closed cases by machine and symptom", enabled: true },
  { name: "procedures.search", version: "1.1.0", kind: "read", description: "Approved procedures for a machine type", enabled: true },
  { name: "machines.get", version: "1.0.0", kind: "read", description: "Machine, type, area and line", enabled: true },
  { name: "knowledge.search", version: "1.0.1", kind: "read", description: "Accepted Saber items", enabled: true },
  { name: "viper.series.query", version: "0.9.0", kind: "read", description: "Signals from Viper around the case (after the pilot)", enabled: false },
  { name: "atlas.ask", version: "0.9.0", kind: "read", description: "Cited answers from Atlas documents (after the pilot)", enabled: false },
  { name: "diagnose.rank", version: "1.3.0", kind: "reason", description: "Rank likely causes with citations; abstains without a source", enabled: true },
];

export const SETTINGS: PlantSettings = { fastRouteThreshold: 0.82, retentionDays: { evidence: 730, audio: 0, cases: 3650 }, terminalLockMin: { panel: 5, workshop: 15 } };
export const LICENSE: License = { plan: "Pro", holder: "Ferrovela Group · North Plant", expires: ago(-220 * DAY), terminals: { used: 3, max: 10 }, devices: { used: 4, max: 25 } };

export const SITES: SiteSummary[] = PLANTS.map((p, i) => ({
  ...p, link: i === 2 ? "degraded" : "online", openCases: [7, 4, 2][i], mttr: [68, 81, 59][i], coverage: [0.71, 0.54, 0.63][i],
  certExpires: ago(-[180, 42, 300][i] * DAY), lastSnapshotAt: ago([4, 9, 140][i]),
}));
export const GROUP_PROCEDURES: GroupProcedure[] = [
  { code: "PROC-EXT-RED-003", title: "Drive-end bearing check and replacement", adoptedBy: 2, plants: 3 },
  { code: "PROC-CMP-AIR-001", title: "Compressed air leak survey", adoptedBy: 3, plants: 3 },
  { code: "PROC-CNV-BLT-002", title: "Belt tracking adjustment", adoptedBy: 1, plants: 3 },
];

const MTTR_DAYS = 30;
/** Thirty days of MTTR with its interval: drifting down after v3 of the bearing procedure. */
export function mttrSeries(plantId: string): MttrPoint[] {
  const r = seeded(hash(`mttr-${plantId}`));
  return Array.from({ length: MTTR_DAYS }, (_, i) => {
    const base = 84 - i * 0.6 + (r() - 0.5) * 18;
    const spread = 10 + r() * 12;
    return { day: ago((MTTR_DAYS - 1 - i) * DAY), minutes: Math.round(base), lo: Math.round(base - spread), hi: Math.round(base + spread) };
  });
}

export const ANALYTICS: Omit<Analytics, "coverage"> = {
  mttrByKind: [
    { kind: "Extruder", p25: 48, median: 71, p75: 96, p90: 131, cases: 38 },
    { kind: "Screw compressor", p25: 35, median: 52, p75: 74, p90: 102, cases: 21 },
    { kind: "Belt conveyor", p25: 22, median: 34, p75: 46, p90: 63, cases: 27 },
    { kind: "Pelletiser", p25: 40, median: 88, p75: 140, p90: 205, cases: 9 },
    { kind: "Mixer", p25: 55, median: 79, p75: 110, p90: 150, cases: 7 },
  ],
  repeats: [{ machine: "EXT-04", count: 5, days: 30 }, { machine: "CMP-01", count: 4, days: 30 }, { machine: "CNV-05", count: 3, days: 30 }, { machine: "PEL-02", count: 3, days: 30 }, { machine: "MIX-01", count: 2, days: 30 }],
  friction: [
    { procedure: "PROC-EXT-RED-003", version: 3, step: "3 Remove the reducer cover", fails: 6, skips: 0, minutes: 19 },
    { procedure: "PROC-EXT-RED-003", version: 3, step: "4 Measure bearing clearance", fails: 4, skips: 0, minutes: 14 },
    { procedure: "PROC-CMP-AIR-001", version: 5, step: "2 Tag and photograph each leak", fails: 1, skips: 3, minutes: 22 },
    { procedure: "PROC-CNV-BLT-002", version: 3, step: "2 Adjust the take-up", fails: 2, skips: 1, minutes: 13 },
    { procedure: "PROC-EXT-SCR-007", version: 2, step: "2 Measure zone temperatures", fails: 2, skips: 0, minutes: 9 },
  ],
  effectiveness: [
    { procedure: "PROC-EXT-RED-003", version: 3, before: 104, after: 81 },
    { procedure: "PROC-CMP-AIR-001", version: 5, before: 70, after: 55 },
    { procedure: "PROC-CNV-BLT-002", version: 3, before: 39, after: 34 },
  ],
  knowledge: ["W43", "W44", "W45", "W46", "W47"].map((week, i) => ({ week, captured: [6, 9, 7, 11, 8][i], accepted: [2, 4, 3, 5, 1][i] })),
};
