import { describe, expect, it } from "vitest";
import { squirclePath } from "./squircle";

describe("squirclePath", () => {
  it("is a closed path that stays inside the box", () => {
    const d = squirclePath(200, 100, 28);
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    const nums = d.replace(/[MLZ]/g, " ").split(/[ ,]+/).filter(Boolean).map(Number);
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...nums.filter((_, i) => i % 2 === 0))).toBeLessThanOrEqual(200);
  });
  it("never uses a radius bigger than half the short side", () => {
    expect(squirclePath(40, 40, 80)).toBe(squirclePath(40, 40, 20));
  });
});
