import { MOCK_NOW } from "@/lib/clock";
import type { Badge, Device, Machine, Plant, Terminal, User } from "../types";

/** All names are fictitious. The same group as Viper's mock: Ferrovela, three plants; Araxos runs in North Plant. */
export const GROUP_NAME = "Ferrovela Group";
const MIN = 60_000;
export const ago = (minutes: number) => new Date(MOCK_NOW - minutes * MIN).toISOString();
export const DAY = 1440;

export const PLANTS: Plant[] = [
  { id: "pl-north", code: "PN", name: "North Plant", city: "Valdemora", areas: ["Extrusion", "Compounding", "Utilities"], lines: ["L1", "L2", "L3", "L4"] },
  { id: "pl-south", code: "PS", name: "South Plant", city: "Arenzal", areas: ["Extrusion", "Packing"], lines: ["L1", "L2", "L3"] },
  { id: "pl-coast", code: "PC", name: "Coast Plant", city: "Marisca", areas: ["Compounding"], lines: ["L1", "L2"] },
];
export const NORTH = PLANTS[0].id;

type U = [id: string, name: string, roles: User["roles"], area: string, hue: number, badge: boolean];
const U_ROWS: U[] = [
  ["u-aruiz", "Ana Ruiz", ["engineer", "lead"], "Maintenance engineering", 168, false],
  ["u-jgarcia", "Javier García", ["technician"], "Mechanical maintenance", 24, true],
  ["u-nrey", "Noelia Rey", ["technician"], "Mechanical maintenance", 300, true],
  ["u-dcosta", "Diego Costa", ["technician"], "Electrical maintenance", 210, true],
  ["u-jperez", "José Pérez", ["technician"], "Mechanical maintenance", 48, true],
  ["u-mlosada", "Marta Losada", ["lead"], "Extrusion", 262, true],
  ["u-lferreiro", "Luis Ferreiro", ["engineer"], "Process engineering", 132, false],
  ["u-pvidal", "Pablo Vidal", ["safety_approver"], "Health and safety", 352, true],
  ["u-ccampos", "Carmen Campos", ["auditor"], "Quality and data protection", 190, false],
  ["u-iotero", "Iván Otero", ["admin"], "IT/OT", 230, false],
  ["u-rsanz", "Rosa Sanz", ["viewer"], "Plant management", 90, false],
];
const shortName = (n: string) => `${n[0]}. ${n.split(" ").slice(1).join(" ")}`;
export const USERS: User[] = U_ROWS.map(([id, name, roles, area, hue, badge], i) => ({
  id, name, short: shortName(name), email: `${id.slice(2)}@ferrovela.example`, roles, area, hue, badge,
  totp: true, lastSeenAt: ago(5 + i * 37),
}));
export const userName = (id: string | null) => USERS.find((u) => u.id === id)?.name ?? "Unknown";
export const userShort = (id: string | null) => USERS.find((u) => u.id === id)?.short ?? "—";

/** Demo PINs for the kiosk: every badge holder uses 1234; the badge "number" is what the reader types. */
export const DEMO_PIN = "1234";
export const BADGE_CODES: Record<string, string> = Object.fromEntries(
  USERS.filter((u) => u.badge).map((u, i) => [`04A1${(0x3c10 + i * 0x111).toString(16).toUpperCase()}`, u.id]),
);

type M = [code: string, name: string, kind: string, area: string, line: string, viper: boolean];
const M_ROWS: M[] = [
  ["EXT-04", "Extruder 4", "Extruder", "Extrusion", "L2", true], ["EXT-03", "Extruder 3", "Extruder", "Extrusion", "L2", true],
  ["EXT-01", "Extruder 1", "Extruder", "Extrusion", "L1", true], ["PEL-02", "Pelletiser 2", "Pelletiser", "Extrusion", "L2", false],
  ["CMP-01", "Compressor 1", "Screw compressor", "Utilities", "L4", true], ["CMP-02", "Compressor 2", "Screw compressor", "Utilities", "L4", true],
  ["MIX-01", "Compound mixer 1", "Mixer", "Compounding", "L3", true], ["GRB-02", "Gearbox line 2", "Gearbox", "Extrusion", "L2", true],
  ["CNV-05", "Outfeed conveyor 5", "Belt conveyor", "Extrusion", "L1", false], ["CHL-01", "Chiller 1", "Chiller", "Utilities", "L4", false],
  ["PRS-04", "Press line 1", "Hydraulic press", "Compounding", "L1", true], ["BMB-11", "Cooling pump 11", "Centrifugal pump", "Utilities", "L3", true],
];
export const MACHINES: Machine[] = M_ROWS.map(([code, name, kind, area, line, viper]) => ({
  id: `m-${code.toLowerCase()}`, plantId: NORTH, code, name, kind, area, line,
  viperCode: viper ? code : null, qr: `araxos://m/${code}`, openCases: 0, procedures: 0,
}));
export const machineCode = (id: string) => MACHINES.find((m) => m.id === id)?.code ?? "—";

export const TERMINALS: Terminal[] = [
  { id: "t-taller2", name: "TALLER-2", area: "Mechanical maintenance", density: "workshop", lastSyncAt: ago(2), pendingOps: 0 },
  { id: "t-taller3", name: "TALLER-3", area: "Mechanical maintenance", density: "workshop", lastSyncAt: ago(1), pendingOps: 0 },
  { id: "t-panel-l2", name: "PANEL-L2", area: "Extrusion line 2", density: "panel", lastSyncAt: ago(3), pendingOps: 0 },
];

type D = [id: string, name: string, kind: Device["kind"], area: string, line: string | null, density: Device["density"], os: string, days: number, seen: number, ops: number];
const D_ROWS: D[] = [
  ["t-taller2", "TALLER-2", "terminal", "Mechanical maintenance", null, "workshop", "Windows 11 IoT · Edge kiosk", 40, 2, 0],
  ["t-taller3", "TALLER-3", "terminal", "Mechanical maintenance", null, "workshop", "Windows 11 IoT · Edge kiosk", 40, 1, 0],
  ["t-panel-l2", "PANEL-L2", "terminal", "Extrusion", "L2", "panel", "Windows 10 IoT · Edge kiosk", 21, 3, 0],
  ["d-aruiz", "Ana Ruiz · laptop", "personal", "Maintenance engineering", null, "office", "Windows 11 · Chrome", 60, 0, 0],
  ["p-armario-1", "Shared phone 1", "phone", "Mechanical maintenance", null, null, "Android 16 · Galaxy XCover7 Pro", 33, 12, 2],
  ["p-armario-2", "Shared phone 2", "phone", "Mechanical maintenance", null, null, "Android 16 · Galaxy XCover7 Pro", 33, 48, 0],
  ["p-mlosada", "Marta Losada · phone", "phone", "Extrusion", "L2", null, "Android 16 · Galaxy Tab Active5", 30, 6, 0],
  ["p-old-3", "Shared phone 3", "phone", "Utilities", null, null, "Android 15 · Galaxy XCover6 Pro", 120, 9000, 0],
];
export const DEVICES: Device[] = D_ROWS.map(([id, name, kind, area, line, density, os, days, seen, ops]) => ({
  id, name, kind, area, line, density, os, enrolledAt: ago(days * DAY), lastSeenAt: ago(seen), status: id === "p-old-3" ? "revoked" : "active", pendingOps: ops,
}));

export const BADGES: Badge[] = Object.entries(BADGE_CODES).map(([code, userId], i) => ({
  id: `b-${i + 1}`, userId, hash: `sha256:${(code.length * 7919 + i * 104729).toString(16)}…${userId.slice(2, 6)}`,
  issuedAt: ago((90 - i * 6) * DAY), lastUsedAt: i === 4 ? null : ago(30 + i * 90), status: "active",
}));
