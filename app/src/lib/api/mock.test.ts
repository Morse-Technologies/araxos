import { beforeEach, describe, expect, it } from "vitest";
import { mockApi as api, resetMock } from "./mock";
import type { Problem } from "./types";

const problemOf = (p: Promise<unknown>) => p.then(() => null, (e: Problem) => e.type);
const reauth = (userId: string) => ({ userId, password: "secret", totp: "123456" });

beforeEach(() => resetMock());

describe("double-signature approval (§29.4)", () => {
  it("needs an engineer and a safety approver on the same hash", async () => {
    const v = (await api.version("pv-pel-002-1"))!;
    expect(v.status).toBe("safety_review");
    const one = await api.sign({ versionId: v.id, sha256: v.bodySha256, role: "engineering", reauth: reauth("u-aruiz") });
    expect(one.signatures).toHaveLength(1);
    expect(one.status).toBe("safety_review");
    const two = await api.sign({ versionId: v.id, sha256: v.bodySha256, role: "safety", reauth: reauth("u-pvidal") });
    expect(two.status).toBe("approved");
  });
  it("refuses the same person twice, the author, a stale hash and a bad code", async () => {
    const v = (await api.version("pv-ext-003-4"))!;
    expect(await problemOf(api.sign({ versionId: v.id, sha256: v.bodySha256, role: "safety", reauth: reauth("u-aruiz") }))).toBe("auth/forbidden");
    expect(await problemOf(api.sign({ versionId: v.id, sha256: "stale", role: "safety", reauth: reauth("u-pvidal") }))).toBe("procedures/hash_mismatch");
    expect(await problemOf(api.sign({ versionId: v.id, sha256: v.bodySha256, role: "safety", reauth: { ...reauth("u-pvidal"), totp: "12" } }))).toBe("auth/reauth_failed");
    const pel = (await api.version("pv-pel-002-1"))!;
    expect(await problemOf(api.sign({ versionId: pel.id, sha256: pel.bodySha256, role: "engineering", reauth: reauth("u-lferreiro") }))).toBe("safety/author_cannot_sign");
  });
  it("any edit changes the hash and drops the signatures", async () => {
    const v = (await api.version("pv-ext-003-4"))!;
    const edited = await api.saveDraft(v.id, v.steps.map((s) => (s.key === "s3" ? { ...s, minutes: 15 } : s)), "u-lferreiro");
    expect(edited.bodySha256).not.toBe(v.bodySha256);
    expect(edited.signatures).toHaveLength(0);
    expect(edited.status).toBe("draft");
  });
  it("editing a version in review records which signatures it invalidated, and the old hash can no longer be signed", async () => {
    const v = (await api.version("pv-ext-003-4"))!;
    await api.saveDraft(v.id, v.steps.map((s) => (s.key === "s3" ? { ...s, minutes: 20 } : s)), "u-lferreiro");
    const last = (await api.audit("pl-north")).find((e) => e.action === "procedure.edit")!;
    expect(last).toMatchObject({ action: "procedure.edit", object: "PROC-EXT-RED-003 v4" });
    expect(last.detail).toContain("Ana Ruiz (engineering)");
    expect(await problemOf(api.sign({ versionId: v.id, sha256: v.bodySha256, role: "safety", reauth: reauth("u-pvidal") }))).not.toBeNull();
  });
});

describe("lockout verification by a second person", () => {
  const apply = () => api.applyLock({ caseId: "c-424", stepKey: "s1", point: "Q1", lockId: "L-22", photo: true, deviceId: "t-taller2" });
  it("blocks the next steps until someone else verifies on another device", async () => {
    await apply();
    expect((await api.case("c-424"))!.status).toBe("blocked");
    expect(await problemOf(api.verifyLock({ lockId: "L-22", scanned: "L-22", verifierId: "u-aruiz", deviceId: "t-taller3", removal: false }))).toBe("safety/self_verification");
    expect(await problemOf(api.verifyLock({ lockId: "L-22", scanned: "L-22", verifierId: "u-mlosada", deviceId: "t-taller2", removal: false }))).toBe("safety/same_device");
    expect(await problemOf(api.verifyLock({ lockId: "L-22", scanned: "L-23", verifierId: "u-mlosada", deviceId: "t-taller3", removal: false }))).toBe("safety/verification_mismatch");
    await api.verifyLock({ lockId: "L-22", scanned: "l-22", verifierId: "u-mlosada", deviceId: "t-taller3", removal: false });
    const c = (await api.case("c-424"))!;
    expect(c.steps[0].state).toBe("done");
    expect(c.steps[1].state).toBe("current");
  });
  it("will not close a case with a lock still on", async () => {
    await apply();
    expect(await problemOf(api.closeCase("c-424", { cause: "x", solution: "y", parts: [], minutes: 10, helped: "yes", change: "" }))).toBe("safety/open_locks");
  });
  it("rejects the wrong isolation point and a missing photo", async () => {
    expect(await problemOf(api.applyLock({ caseId: "c-424", stepKey: "s1", point: "Q2", lockId: "L-22", photo: true, deviceId: "t-taller2" }))).toBe("safety/wrong_point");
    expect(await problemOf(api.applyLock({ caseId: "c-424", stepKey: "s1", point: "Q1", lockId: "L-22", photo: false, deviceId: "t-taller2" }))).toBe("cases/requirement_missing");
  });
});

describe("steps", () => {
  it("a step with a requirement cannot be confirmed without its evidence", async () => {
    expect(await problemOf(api.confirmStep({ caseId: "c-421", stepKey: "s3" }))).toBe("cases/requirement_missing");
    await api.addEvidence({ caseId: "c-421", stepKey: "s3", evidence: { kind: "photo", label: "Cover off", by: "A. Ruiz", value: null, unit: null, inRange: null } });
    const c = await api.confirmStep({ caseId: "c-421", stepKey: "s3" });
    expect(c.steps[3].state).toBe("current");
  });
  it("a decision jumps to its branch and marks the skipped steps", async () => {
    const run = await api.dryRun("pv-ext-003-3", { s5: "Within tolerance" });
    expect(run.path).toEqual(["s1", "s2", "s3", "s4", "s5", "s7", "s8"]);
  });
  it("the engine abstains when no approved procedure exists", async () => {
    const p = await api.propose("c-420");
    expect(p.route).toBe("abstain");
  });
});

describe("terminal sign-in", () => {
  it("takes a badge and the PIN, and refuses a wrong PIN", async () => {
    const u = await api.badgeLogin({ terminalId: "t-taller2", badge: null, userId: "u-mlosada", pin: "1234" });
    expect(u.name).toBe("Marta Losada");
    expect(await problemOf(api.badgeLogin({ terminalId: "t-taller2", badge: null, userId: "u-mlosada", pin: "9999" }))).toBe("auth/bad_pin");
  });
});

describe("drafts", () => {
  it("opens one draft at a time from the approved version", async () => {
    const v = await api.createDraft("pv-cmp-001-5", "u-aruiz");
    expect(v).toMatchObject({ n: 6, status: "draft", signatures: [], id: "pv-cmp-001-6" });
    await expect(api.createDraft("pv-cmp-001-5", "u-aruiz")).rejects.toMatchObject({ type: "procedures/draft_exists" });
    await expect(api.createDraft("pv-ext-003-3", "u-aruiz")).rejects.toMatchObject({ type: "procedures/draft_exists" });
  });
});
