import { sha256 } from "../random";
import type { Procedure, ProcedureVersion, Signature, Step } from "../types";
import { DAY, ago } from "./world";

/** Step builder with the common defaults; every procedure below reads as a list of these. */
const step = (n: number, s: Partial<Step> & Pick<Step, "kind" | "title" | "body">): Step => ({
  key: `s${n}`, n, minutes: 5, requirements: [], cite: null, range: null, lock: null, branches: [], ...s,
});

export const bodySha = (steps: Step[]) => sha256(JSON.stringify(steps));

const R200 = "Reducer R-200 manual";
const EXT_BEARING_V3: Step[] = [
  step(1, { kind: "safety", title: "Electrical lockout of the main motor", body: "Open isolator Q1 and fit your personal lock. Tag it with the case number.", minutes: 8,
    lock: { point: "Q1", action: "apply", energy: "Electrical 400 V" }, requirements: [{ kind: "photo", label: "Photo of the lock in place" }] }),
  step(2, { kind: "measurement", title: "Check for absence of voltage", body: "Measure between phases at the motor terminal box with the two-pole tester.", minutes: 4,
    range: { min: 0, max: 1, unit: "V", onOutOfRange: "Stop. The isolation is not effective: call the shift lead." }, requirements: [{ kind: "measurement", label: "Voltage between phases (V)" }] }),
  step(3, { kind: "instruction", title: "Remove the reducer cover", body: "Loosen the 6 M10 bolts. Keep the gaskets.", minutes: 12,
    cite: { doc: R200, page: 47, kind: "manual", quote: "Cover bolts M10, reference torque 45 N·m." }, requirements: [{ kind: "photo", label: "Photo of the cover removed" }] }),
  step(4, { kind: "measurement", title: "Measure bearing clearance", body: "Feeler gauge between the outer race and the housing, at three points.", minutes: 10,
    range: { min: 0.1, max: 0.3, unit: "mm", onOutOfRange: "Above 0.3 mm the bearing is worn: replace it in the next step." }, requirements: [{ kind: "measurement", label: "Clearance (mm)" }] }),
  step(5, { kind: "decision", title: "Bearing condition", body: "Pick what you see. The next step depends on it.", minutes: 2,
    branches: [{ label: "Worn or noisy", to: "s6" }, { label: "Within tolerance", to: "s7" }] }),
  step(6, { kind: "instruction", title: "Replace the drive-end bearing", body: "Use the induction heater (110 °C). Never hammer the race.", minutes: 35,
    cite: { doc: R200, page: 112, kind: "manual", quote: "Mount 6312-2Z/C3 hot; do not exceed 120 °C." }, requirements: [{ kind: "photo", label: "Photo of the new bearing seated" }] }),
  step(7, { kind: "measurement", title: "Refit the cover and torque the bolts", body: "Tighten crosswise in two passes.", minutes: 10,
    range: { min: 85, max: 95, unit: "N·m", onOutOfRange: "Re-torque. If a bolt will not hold, replace it before going on." }, requirements: [{ kind: "measurement", label: "Final torque (N·m)" }] }),
  step(8, { kind: "safety", title: "Remove the lockout", body: "Clear the area, remove your lock from Q1 and ask the verifier to confirm.", minutes: 6,
    lock: { point: "Q1", action: "remove", energy: "Electrical 400 V" } }),
];
const EXT_BEARING_V4: Step[] = EXT_BEARING_V3.map((s) => s.key === "s3"
  ? { ...s, body: "Loosen the 8 M10 bolts crosswise. Keep the gaskets and check them for cracks.", minutes: 14 } : s);

const PEL_HOPPER: Step[] = [
  step(1, { kind: "safety", title: "Lock out the feeder and the cutter", body: "Isolate Q7 (feeder) and Q8 (cutter). One lock each.", minutes: 10,
    lock: { point: "Q7 + Q8", action: "apply", energy: "Electrical 400 V and pneumatic 6 bar" }, requirements: [{ kind: "photo", label: "Photo of both locks" }] }),
  step(2, { kind: "checklist", title: "Bleed the pneumatic line", body: "Open the bleed valve V3 and check the gauge reads 0 bar.", minutes: 3, requirements: [{ kind: "photo", label: "Gauge at 0 bar" }] }),
  step(3, { kind: "instruction", title: "Clear the hopper throat", body: "Use the nylon rod from the tool board. No hands below the grid.", minutes: 15 }),
  step(4, { kind: "safety", title: "Remove the lockout", body: "Remove both locks and ask the verifier to confirm.", minutes: 5, lock: { point: "Q7 + Q8", action: "remove", energy: "Electrical and pneumatic" } }),
];
const CMP_LEAK: Step[] = [
  step(1, { kind: "instruction", title: "Walk the ring main with the ultrasonic detector", body: "Start at the receiver, follow the tag order.", minutes: 25 }),
  step(2, { kind: "photo", title: "Tag and photograph each leak", body: "Red tag on the leak, photo with the tag visible.", minutes: 15, requirements: [{ kind: "photo", label: "One photo per leak" }] }),
  step(3, { kind: "measurement", title: "Record the receiver pressure", body: "Read the gauge on the receiver.", minutes: 2, range: { min: 6.5, max: 7.5, unit: "bar", onOutOfRange: "Note it and tell the shift lead." }, requirements: [{ kind: "measurement", label: "Pressure (bar)" }] }),
];
const EXT_SCREW: Step[] = [
  step(1, { kind: "instruction", title: "Run the barrel empty", body: "Purge with the cleaning compound until it runs clear.", minutes: 20 }),
  step(2, { kind: "measurement", title: "Measure zone temperatures", body: "Read zones 1–5 on the HMI.", minutes: 5, range: { min: 180, max: 230, unit: "°C", onOutOfRange: "Wait 10 minutes and read again." }, requirements: [{ kind: "measurement", label: "Highest zone (°C)" }] }),
  step(3, { kind: "photo", title: "Photograph the screw tip", body: "Through the inspection port, with the lamp.", minutes: 5, requirements: [{ kind: "photo", label: "Screw tip" }] }),
];
const MIX_SEAL: Step[] = [
  step(1, { kind: "instruction", title: "Drain the mixer", body: "Open the bottom valve into the IBC.", minutes: 15 }),
  step(2, { kind: "instruction", title: "Remove the paddle seal housing", body: "Four M12 bolts.", minutes: 20 }),
];
const CNV_BELT: Step[] = [
  step(1, { kind: "instruction", title: "Check belt tracking at the tail pulley", body: "Run at slow speed and watch the edge.", minutes: 10 }),
  step(2, { kind: "measurement", title: "Adjust the take-up", body: "Quarter turns, both sides equal.", minutes: 10, range: { min: 2, max: 5, unit: "mm", onOutOfRange: "Stop adjusting; check the pulley alignment." }, requirements: [{ kind: "measurement", label: "Edge offset (mm)" }] }),
];

const sig = (role: Signature["role"], userId: string, name: string, at: string, steps: Step[]): Signature => ({ role, userId, name, at, sha256: bodySha(steps) });
type V = { id: string; p: string; n: number; status: ProcedureVersion["status"]; steps: Step[]; author: string; editor: string; created: number; approved: number | null; note: string; sigs?: Signature[] };
const v = (x: V): ProcedureVersion => ({
  id: x.id, procedureId: x.p, n: x.n, status: x.status, steps: x.steps, bodySha256: bodySha(x.steps), authorId: x.author, lastEditorId: x.editor,
  createdAt: ago(x.created), approvedAt: x.approved === null ? null : ago(x.approved), changeNote: x.note, signatures: x.sigs ?? [], comments: [],
});

const V3_AT = ago(7 * DAY);
export const VERSIONS: ProcedureVersion[] = [
  v({ id: "pv-ext-003-2", p: "pr-ext-003", n: 2, status: "retired", steps: EXT_BEARING_V3.slice(0, 7), author: "u-lferreiro", editor: "u-lferreiro", created: 140 * DAY, approved: 120 * DAY, note: "First version with the clearance check." }),
  v({ id: "pv-ext-003-3", p: "pr-ext-003", n: 3, status: "approved", steps: EXT_BEARING_V3, author: "u-lferreiro", editor: "u-lferreiro", created: 9 * DAY, approved: 7 * DAY, note: "Adds the explicit lockout removal step (step 8).",
    sigs: [sig("engineering", "u-aruiz", "Ana Ruiz", V3_AT, EXT_BEARING_V3), sig("safety", "u-pvidal", "Pablo Vidal", V3_AT, EXT_BEARING_V3)] }),
  v({ id: "pv-ext-003-4", p: "pr-ext-003", n: 4, status: "safety_review", steps: EXT_BEARING_V4, author: "u-lferreiro", editor: "u-lferreiro", created: 1 * DAY, approved: null, note: "Cover has 8 bolts, not 6 (Saber item from J. García, CASE-2026-00377).",
    sigs: [sig("engineering", "u-aruiz", "Ana Ruiz", ago(38), EXT_BEARING_V4)] }),
  v({ id: "pv-pel-002-1", p: "pr-pel-002", n: 1, status: "safety_review", steps: PEL_HOPPER, author: "u-lferreiro", editor: "u-lferreiro", created: 2 * DAY, approved: null, note: "New procedure from the interview with J. Pérez." }),
  v({ id: "pv-cmp-001-5", p: "pr-cmp-001", n: 5, status: "approved", steps: CMP_LEAK, author: "u-aruiz", editor: "u-aruiz", created: 60 * DAY, approved: 58 * DAY, note: "Ultrasonic detector replaces soapy water.",
    sigs: [sig("engineering", "u-lferreiro", "Luis Ferreiro", ago(58 * DAY), CMP_LEAK)] }),
  v({ id: "pv-ext-007-2", p: "pr-ext-007", n: 2, status: "approved", steps: EXT_SCREW, author: "u-aruiz", editor: "u-aruiz", created: 30 * DAY, approved: 29 * DAY, note: "Temperature range per zone.",
    sigs: [sig("engineering", "u-lferreiro", "Luis Ferreiro", ago(29 * DAY), EXT_SCREW)] }),
  v({ id: "pv-mix-004-1", p: "pr-mix-004", n: 1, status: "draft", steps: MIX_SEAL, author: "u-aruiz", editor: "u-aruiz", created: 3 * 60, approved: null, note: "Draft from the PDF of the mixer manual." }),
  v({ id: "pv-cnv-002-3", p: "pr-cnv-002", n: 3, status: "approved", steps: CNV_BELT, author: "u-lferreiro", editor: "u-lferreiro", created: 90 * DAY, approved: 88 * DAY, note: "Offset range tightened to 2–5 mm.",
    sigs: [sig("engineering", "u-aruiz", "Ana Ruiz", ago(88 * DAY), CNV_BELT)] }),
];

type P = [id: string, code: string, title: string, kind: string, used: number];
const P_ROWS: P[] = [
  ["pr-ext-003", "PROC-EXT-RED-003", "Drive-end bearing check and replacement", "Extruder", 41],
  ["pr-ext-007", "PROC-EXT-SCR-007", "Screw and barrel inspection", "Extruder", 12],
  ["pr-pel-002", "PROC-PEL-HOP-002", "Clear a hopper blockage", "Pelletiser", 0],
  ["pr-cmp-001", "PROC-CMP-AIR-001", "Compressed air leak survey", "Screw compressor", 19],
  ["pr-mix-004", "PROC-MIX-SEA-004", "Paddle seal replacement", "Mixer", 0],
  ["pr-cnv-002", "PROC-CNV-BLT-002", "Belt tracking adjustment", "Belt conveyor", 27],
];
const minutesOf = (steps: Step[]) => steps.reduce((s, x) => s + x.minutes, 0);
export function procedureSummaries(versions: ProcedureVersion[]): Procedure[] {
  return P_ROWS.map(([id, code, title, kind, used]) => {
    const vs = versions.filter((x) => x.procedureId === id).sort((a, b) => a.n - b.n);
    const approved = vs.filter((x) => x.status === "approved").at(-1);
    const open = vs.find((x) => x.status === "draft" || x.status === "review" || x.status === "safety_review");
    return { id, code, title, machineKind: kind, minutes: minutesOf((approved ?? vs.at(-1)!).steps), approved: approved?.n ?? null, draft: open?.n ?? null, versions: vs.map((x) => x.id), usedInCases: used };
  });
}
export const MACHINE_KINDS = ["Extruder", "Pelletiser", "Screw compressor", "Mixer", "Gearbox", "Belt conveyor", "Chiller", "Hydraulic press", "Centrifugal pump"];
