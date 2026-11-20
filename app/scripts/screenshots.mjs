// Screenshots of the key screens, light and dark, desktop and phone. Needs a running server (`pnpm dev`).
// Usage: node scripts/screenshots.mjs [baseUrl] [outDir]   (CHROME_PATH to use a system Chrome)
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://localhost:3210";
const OUT = process.argv[3] ?? "screenshots";
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

const SHOTS = [
  { name: "console-queue", path: "/queue/n-482", view: DESKTOP },
  { name: "console-double", path: "/queue/n-481", view: DESKTOP },
  { name: "console-diff", path: "/queue/n-482/diff", view: DESKTOP },
  { name: "console-audit", path: "/history/audit", view: DESKTOP },
  { name: "console-connectors", path: "/admin/connectors", view: DESKTOP },
  { name: "console-settings", path: "/admin/settings", view: DESKTOP },
  { name: "mobile-frame-home", path: "/m", view: DESKTOP },
  { name: "phone-home", path: "/m", view: PHONE, mobile: true },
  { name: "phone-review", path: "/m/review/n-482", view: PHONE, mobile: true },
  { name: "phone-car", path: "/m/car", view: PHONE, mobile: true },
];

async function shoot(browser, s, theme) {
  const ctx = await browser.newContext({ viewport: s.view, deviceScaleFactor: 2, colorScheme: theme, isMobile: !!s.mobile, hasTouch: !!s.mobile, reducedMotion: "reduce", permissions: ["microphone"] });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${s.path}?fast`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${s.name}-${theme}.png` });
  await ctx.close();
}

async function recordingShot(browser, theme) {
  const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 2, colorScheme: theme, isMobile: true, hasTouch: true, permissions: ["microphone"] });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/m/record?fast`, { waitUntil: "networkidle" });
  await page.getByTestId("record").click();
  await page.waitForTimeout(7000);
  await page.screenshot({ path: `${OUT}/phone-recording-${theme}.png` });
  await ctx.close();
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
for (const theme of ["light", "dark"]) {
  for (const s of SHOTS) await shoot(browser, s, theme);
  await recordingShot(browser, theme);
}
await browser.close();
console.log(`Saved to ${OUT}`);
