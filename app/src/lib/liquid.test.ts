import { describe, expect, it } from "vitest";
import { displacementMap, filterMarkup, withDefaults } from "./liquid";

describe("liquid glass filter", () => {
  it("sizes the map and the filter to the surface", () => {
    const f = filterMarkup("lg-1", 320, 64, { radius: 32 });
    expect(f).toContain('width="320" height="64"');
    expect(f).toContain("feDisplacementMap");
    expect(f).toContain('scale="-36"');
  });
  it("keeps the middle neutral so only the rim bends", () => {
    const map = decodeURIComponent(displacementMap(100, 50, withDefaults({ radius: 20 })));
    expect(map).toContain('fill="#808080"');
  });
});
