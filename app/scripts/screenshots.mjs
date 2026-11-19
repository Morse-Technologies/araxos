// Saves light and dark screenshots of each screen to ./screenshots (gitignored). Needs `pnpm dev` running.
// Each route opens as the person who would use it (`?as=` is the mock's persona switch).
// Usage: node scripts/screenshots.mjs [baseUrl] [route ...]
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const ANA = "u-aruiz", JOSE = "u-jgarcia", PABLO = "u-pvidal", CARMEN = "u-ccampos", IVAN = "u-iotero", MARTA = "u-mlosada";
/** [route, persona, file name] */
const ALL = [
  ["/login", ANA, "login"], ["/setup", ANA, "setup"],
  ["/work", JOSE, "work"], ["/dashboard", ANA, "dashboard"], ["/cases", MARTA, "cases"], ["/cases?id=c-418", MARTA, "cases-blocked"],
  ["/cases/new", JOSE, "cases-new"], ["/cases/c-421/run", JOSE, "run"], ["/cases/c-424/run", ANA, "run-safety"],
  ["/studio", ANA, "studio"], ["/studio/interview", ANA, "studio-interview"],
  ["/review", ANA, "review"], ["/review?v=pv-ext-003-4", PABLO, "review-safety-approver"],
  ["/knowledge", ANA, "knowledge"], ["/safety", PABLO, "safety"], ["/machines", ANA, "machines"], ["/analytics", ANA, "analytics"],
  ["/audit", CARMEN, "audit"], ["/hub", IVAN, "hub"], ["/settings", IVAN, "settings"], ["/settings?tab=devices", IVAN, "settings-devices"],
  ["/settings?tab=mcp", IVAN, "settings-mcp"], ["/settings?tab=station", JOSE, "settings-station"],
  ["/wall", ANA, "wall"], ["/kiosk", ANA, "kiosk"], ["/kiosk/verify?lock=L-09", ANA, "kiosk-verify"],
  ["/safety/verify?lock=L-09", MARTA, "safety-verify-laptop"], ["/cases/c-421/run", JOSE, "run-camera"], ["/studio?id=pr-ext-003&v=pv-ext-003-4", "u-lferreiro", "studio-edit-in-review"],
];
/** Screens that need a step before the shot: the camera sheet open, the edit-in-review confirmation. */
const BEFORE = {
  "run-camera": async (page) => { await page.getByRole("button", { name: "Add photo" }).click(); await page.getByRole("button", { name: "Take photo" }).waitFor(); },
  "studio-edit-in-review": async (page) => { await page.getByLabel("Minutes").fill("25"); await page.getByRole("button", { name: "Save", exact: true }).click(); },
};
const only = process.argv.slice(3);
const ROUTES = only.length ? ALL.filter(([r]) => only.includes(r)) : ALL;
const SETTLE_MS = 1800;

mkdirSync("screenshots", { recursive: true });
// Chromium's fake camera, so the camera sheet shows a live preview.
const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme, permissions: ["camera"] });
  const page = await context.newPage();
  await page.goto(`${base}/login`);
  await page.evaluate(() => localStorage.clear());
  for (const [route, as, name] of ROUTES) {
    await page.setViewportSize(route === "/wall" ? { width: 1920, height: 1080 } : { width: 1440, height: 900 });
    await page.goto(`${base}${route}${route.includes("?") ? "&" : "?"}as=${as}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(SETTLE_MS);
    if (BEFORE[name]) { await BEFORE[name](page); await page.waitForTimeout(SETTLE_MS); }
    await page.screenshot({ path: `screenshots/${name}-${theme}.png` });
  }
  await context.close();
}
await browser.close();
