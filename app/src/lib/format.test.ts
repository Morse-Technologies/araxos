import { describe, expect, it } from "vitest";
import { euros, noteNo, when, writesSummary } from "./format";

describe("format", () => {
  it("writes note numbers like a receipt book", () => expect(noteNo(482)).toBe("N.º 000482"));
  it("shows Madrid time", () => expect(when("2026-11-20T12:18:00Z")).toBe("20-11 · 13:18"));
  it("uses Spanish money format", () => expect(euros(4200).replace(/\s/g, " ")).toBe("4.200,00 €"));
  it("summarises the writes of an approval", () => {
    const acts = [{ system: "Odoo", model: "a" }, { system: "Odoo", model: "b" }, { system: "Odoo", model: "c" }, { system: "Google Calendar", model: "event" }];
    expect(writesSummary(acts)).toBe("3 registros en Odoo y 1 evento en Google Calendar");
  });
});
