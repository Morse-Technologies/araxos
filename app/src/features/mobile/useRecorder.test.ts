import { describe, expect, it } from "vitest";
import { rms, syntheticLevel } from "./useRecorder";

describe("waveform levels", () => {
  it("silence is zero and a loud signal saturates at 1", () => {
    expect(rms(new Float32Array(256))).toBe(0);
    expect(rms(new Float32Array(256).fill(0.9))).toBe(1);
  });
  it("the synthetic envelope stays within 0..1", () => {
    for (let t = 0; t < 10_000; t += 37) {
      const v = syntheticLevel(t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
