import { beforeEach, describe, expect, it } from "vitest";
import { api, resetMock, setMockActor, setMockLatency } from "./index";

beforeEach(() => { resetMock(); setMockLatency(0); setMockActor("u-carmen"); });

describe("queue", () => {
  it("groups urgent first and leaves applied and rejected notes out", async () => {
    const groups = await api.queue();
    expect(groups.map((g) => g.key)).toEqual(["urgent", "today", "earlier"]);
    expect(groups[0].items.map((n) => n.number)).toEqual([485]);
    const all = groups.flatMap((g) => g.items.map((n) => n.number));
    expect(all).not.toContain(476);
    expect(all).not.toContain(475);
  });
});

describe("approving a note", () => {
  it("refuses while a question is open, then applies once answered and the conflict is fixed", async () => {
    await expect(api.approveAll("n-482")).rejects.toThrow("preguntas");
    await api.answer("n-482", { actionId: "n-482-a3", optionId: "c2" });
    await expect(api.approveAll("n-482")).rejects.toThrow("conflicto");
    const fixed = await api.resolveConflict("n-482-a4");
    expect(fixed.actions[3].fields[0].after).toBe("Jue 26-11 · 11:00–13:00");
    const done = await api.approveAll("n-482");
    expect(done.state).toBe("applied");
    expect(done.actions.every((a) => a.externalRef)).toBe(true);
    expect(done.actions[2].fields.find((f) => f.key === "price")?.after).toBe("21,90 €");
  });

  it("needs two different people above 3.000 €", async () => {
    const first = await api.approveAll("n-481");
    expect(first.state).toBe("awaiting_second");
    await expect(api.approveAll("n-481")).rejects.toThrow("otra persona");
    setMockActor("u-rosa");
    const second = await api.approveAll("n-481");
    expect(second.state).toBe("applied");
    expect(second.approvals.map((a) => a.step)).toEqual([1, 2]);
  });

  it("undo puts the note back in the queue", async () => {
    await api.approveAll("n-480");
    const back = await api.undo("n-480");
    expect(back.state).toBe("ready");
    expect(back.actions.every((a) => a.state === "proposed")).toBe(true);
  });
});

describe("corrections", () => {
  it("choosing another customer rewrites every field that came from it and can teach an alias", async () => {
    const n = await api.correct("n-482", { kind: "entity", entityId: "e1", candidateId: "c2", rememberAlias: true });
    expect(n.actions[0].fields[0].after).toBe("Conservas del Cantábrico (Laredo)");
    const vocab = await api.vocab();
    expect(vocab.find((v) => v.term === "Conservas del Cantábrico (Laredo)")?.aliases[0]).toMatchObject({ text: "Conservas del Cantábrico", learned: true });
  });
});

describe("audit chain", () => {
  it("verifies after a run of changes", async () => {
    await api.reject("n-479", "Repetida");
    await api.undo("n-479");
    const v = await api.verifyAudit();
    expect(v.ok).toBe(true);
    expect(v.checked).toBeGreaterThan(9);
  });
});

describe("recording a note on the phone", () => {
  it("creates a draft from a scenario and submits it to the office", async () => {
    setMockActor("u-javier");
    const n = await api.createNote({ scenario: "marta-hornos", durationSec: 21 });
    expect(n.state).toBe("draft");
    expect(n.number).toBe(486);
    const sent = await api.submit(n.id);
    expect(sent.state).toBe("ready");
  });
});
