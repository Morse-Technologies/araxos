import { describe, expect, it } from "vitest";
import { FOOTER, JUMPS, TITLES, allScreens, homeFor, navGroups } from "./nav";

const counts = { mine: 2, review: 0, knowledge: 4, locks: 1 };
const hrefs = (roles: Parameters<typeof navGroups>[0]) => navGroups(roles, counts).flat().map((i) => i.href);

describe("navigation", () => {
  it("gives every screen a breadcrumb title and a G-letter jump", () => {
    const jumps = new Set(Object.values(JUMPS));
    for (const it of [...allScreens(counts), ...FOOTER].filter((i) => i.href !== "/wall")) {
      expect(TITLES[it.href.slice(1)]).toBeTruthy();
      expect(jumps.has(it.href)).toBe(true);
    }
  });
  it("filters the rail by role, as §15.11 lists it", () => {
    expect(hrefs(["technician"])).toEqual(["/work", "/cases", "/knowledge", "/machines"]);
    expect(hrefs(["auditor"])).toEqual(["/cases", "/safety", "/audit"]);
    expect(hrefs(["viewer"])).toEqual(["/dashboard", "/analytics", "/wall", "/hub"]);
  });
  it("shows the union for several roles and lands on the first role's home", () => {
    expect(hrefs(["engineer", "lead"])).toContain("/work");
    expect(hrefs(["engineer", "lead"])).toContain("/safety");
    expect(homeFor(["engineer", "lead"])).toBe("/cases");
    expect(homeFor(["safety_approver"])).toBe("/review");
  });
  it("shows a count only when there is something to count", () => {
    const items = navGroups(["engineer", "lead"], counts).flat();
    expect(items.find((i) => i.href === "/work")?.count).toBe(2);
    expect(items.find((i) => i.href === "/review")?.count).toBeUndefined();
  });
});
