import { describe, expect, it } from "vitest";
import type { Entity } from "@/lib/api";
import { confidenceLevel, segments } from "./entityIcons";

const ent = (id: string, from: number, to: number): Entity => ({ id, type: "customer", from, to, value: id, confidence: 0.9, candidates: [], chosen: "" });

describe("transcript segments", () => {
  it("interleaves plain words and entities without gaps", () => {
    const s = segments(10, [ent("b", 6, 7), ent("a", 2, 3)]);
    expect(s.map((x) => (x.kind === "words" ? `${x.from}-${x.to}` : x.entity.id))).toEqual(["0-1", "a", "4-5", "b", "8-9"]);
  });
  it("maps confidence to the three underline styles", () => {
    expect([0.9, 0.7, 0.5].map(confidenceLevel)).toEqual(["high", "medium", "low"]);
  });
});
