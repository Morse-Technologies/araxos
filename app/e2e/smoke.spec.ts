import { expect, test, type Locator, type Page } from "@playwright/test";

/** Every screen renders on mock data, as the person who would use it (`?as=` is the mock persona switch). */
const SCREENS: [string, RegExp][] = [
  ["/work?as=u-jgarcia", /My work/], ["/dashboard", /Dashboard/], ["/cases", /Cases/], ["/cases/new", /New incident/],
  ["/cases/c-421/run?as=u-jgarcia", /Remove the reducer cover/], ["/studio", /Studio/], ["/studio/interview", /Interview with/],
  ["/review", /Signatures/], ["/knowledge", /Saber/], ["/safety?as=u-pvidal", /Safety/], ["/machines", /Machines/],
  ["/analytics", /Analytics/], ["/audit?as=u-ccampos", /Chain verified/], ["/hub?as=u-iotero", /Group hub/],
  ["/settings?as=u-iotero", /Settings/], ["/wall", /Open cases/], ["/kiosk", /Scan your badge/], ["/login", /Sign in to Araxos/],
];

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await page.evaluate(() => localStorage.clear());
});

for (const [path, heading] of SCREENS) {
  test(`${path} renders`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(path);
    await expect(page.locator("main").getByText(heading).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

/** Press and hold a HoldButton past its threshold (1200 ms for safety actions). */
async function hold(page: Page, button: Locator, ms = 1500) {
  await expect(button).toBeEnabled();
  await button.hover();
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

async function badge(page: Page, name: string) {
  await page.getByRole("button", { name }).click();
  for (const d of "1234") await page.getByRole("button", { name: d, exact: true }).click();
}

async function applyL21(page: Page) {
  await page.goto("/cases/c-424/run?as=u-aruiz");
  await expect(page.getByRole("heading", { name: "Electrical lockout of the main motor" })).toBeVisible();
  await page.getByRole("button", { name: "Scan" }).first().click();
  await page.getByRole("button", { name: "Scan" }).nth(1).click();
  await page.getByRole("button", { name: "Take photo" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Take photo" }).click();
  await expect(page.getByText("Taken")).toBeVisible();
  await hold(page, page.getByRole("button", { name: "Hold to apply the lock" }));
  await expect(page.getByText("Waiting for a second person")).toBeVisible();
}

test("a lockout needs a second person on a second device before the work goes on", async ({ page, context }) => {
  await applyL21(page);

  // The second terminal is another window on the same demo world.
  const other = await context.newPage();
  await other.emulateMedia({ reducedMotion: "reduce" });

  // 1. The person who applied it cannot verify it.
  await other.goto("/kiosk/verify?lock=L-21&terminal=t-taller3");
  await badge(other, "Ana Ruiz");
  await other.getByRole("button", { name: "Scan L-21" }).click();
  await hold(other, other.getByRole("button", { name: "Hold to verify" }));
  await expect(other.getByText("safety/self_verification")).toBeVisible();

  // 2. Someone else, but on the device that applied it.
  await other.goto("/kiosk/verify?lock=L-21&terminal=d-aruiz");
  await badge(other, "Marta Losada");
  await other.getByRole("button", { name: "Scan L-21" }).click();
  await hold(other, other.getByRole("button", { name: "Hold to verify" }));
  await expect(other.getByText("safety/same_device")).toBeVisible();

  // 3. Another person, another terminal, but the wrong lock scanned; then the right one.
  await other.goto("/kiosk/verify?lock=L-21&terminal=t-taller3");
  await badge(other, "Marta Losada");
  await other.getByRole("button", { name: "Scan another lock (demo)" }).click();
  await hold(other, other.getByRole("button", { name: "Hold to verify" }));
  await expect(other.getByText("safety/verification_mismatch")).toBeVisible();
  await other.getByRole("button", { name: "Scan L-21" }).click();
  await hold(other, other.getByRole("button", { name: "Hold to verify" }));
  await expect(other.getByRole("heading", { name: "Lock verified" })).toBeVisible();

  // The first terminal moves on by itself.
  await expect(page.getByRole("heading", { name: "Check for absence of voltage" })).toBeVisible();
});

test("a shift lead verifies a lockout from their own laptop, never their own lock", async ({ page }) => {
  await applyL21(page);

  // Ana is a lead too, but she applied L-21.
  await page.goto("/safety/verify?lock=L-21&as=u-aruiz");
  await page.getByRole("button", { name: "Scan L-21" }).click();
  await hold(page, page.getByRole("button", { name: "Hold to verify" }));
  await expect(page.getByText("safety/self_verification")).toBeVisible();

  // A technician cannot verify from a laptop.
  await page.goto("/safety/verify?lock=L-21&as=u-jgarcia");
  await expect(page.getByText("Only shift leads and named verifiers can verify a lock.")).toBeVisible();

  // Marta, from her laptop.
  await page.goto("/safety?as=u-mlosada");
  await page.getByRole("radio", { name: "Waiting" }).click();
  await page.getByRole("row", { name: /L-21/ }).getByRole("link", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/safety\/verify\?lock=L-21/);
  await page.getByRole("button", { name: "Scan L-21" }).click();
  await hold(page, page.getByRole("button", { name: "Hold to verify" }));
  await expect(page.getByRole("heading", { name: "Lock verified" })).toBeVisible();

  await page.goto("/cases/c-424/run?as=u-aruiz");
  await expect(page.getByRole("heading", { name: "Check for absence of voltage" })).toBeVisible();
});

test("a safety procedure is approved only with an engineer's and a safety approver's signature", async ({ page }) => {
  const sign = async (role: string) => {
    await page.getByRole("button", { name: `Sign as ${role}` }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Password").fill("demo password");
    await dialog.getByRole("textbox").nth(1).click();
    await page.keyboard.type("482913");
    await hold(page, dialog.getByRole("button", { name: "Hold to sign" }));
  };
  await page.goto("/review?v=pv-pel-002-1&as=u-aruiz");
  await expect(page.getByText("0 of 2", { exact: true })).toBeVisible();
  await expect(page.getByText("Needs a safety approver.")).toBeVisible();
  await sign("engineer");
  await expect(page.getByText("1 of 2", { exact: true })).toBeVisible();

  await page.goto("/review?v=pv-pel-002-1&as=u-pvidal");
  await expect(page.getByText("Needs an engineer.")).toHaveCount(0);
  await sign("safety approver");
  await expect(page.getByText("2 of 2", { exact: true })).toBeVisible();
  await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible();
});

test("editing a version in review asks first, then invalidates its signatures", async ({ page }) => {
  await page.goto("/studio?id=pr-ext-003&v=pv-ext-003-4&as=u-lferreiro");
  await expect(page.getByText("1 of 2 signatures")).toBeVisible();
  await expect(page.getByRole("note")).toContainText("invalidates it");
  await page.getByLabel("Minutes").fill("25");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Save changes to v4 in review?" });
  await expect(dialog).toContainText("Ana Ruiz");
  await dialog.getByRole("button", { name: "Keep editing" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("1 of 2 signatures")).toBeVisible();

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save and invalidate 1 signature" }).click();
  await expect(page.getByText("v4 is back in draft")).toBeVisible();
  await expect(page.getByRole("button", { name: "Hold to send to review" })).toBeVisible();
  await expect(page.getByText("1 of 2 signatures")).toBeHidden();

  await page.goto("/audit?as=u-ccampos");
  await expect(page.getByText("Edited version in review").first()).toBeVisible();
});

test("unassigned cases follow the technician's zone, with a way to see them all", async ({ page }) => {
  await page.goto("/work?as=u-jgarcia");
  const section = page.locator("section", { has: page.getByRole("heading", { name: "Unassigned" }) });
  await expect(section.getByRole("radio", { name: "My zone · Extrusion" })).toBeChecked();
  await expect(section.getByRole("button", { name: "Take it" })).toHaveCount(1);
  await expect(section.getByText("1 more in other zones.")).toBeVisible();
  await section.getByRole("radio", { name: "All zones" }).click();
  await expect(section.getByRole("button", { name: "Take it" })).toHaveCount(2);
  await expect(section.getByText("Utilities")).toBeVisible();
});

test("the theme toggle switches to dark and back", async ({ page }) => {
  await page.goto("/dashboard");
  const html = page.locator("html");
  await page.getByRole("button", { name: /switch to dark theme/i }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: /switch to light theme/i }).click();
  await expect(html).toHaveAttribute("data-theme", "light");
});

test("the rail follows the person's roles", async ({ page }) => {
  await page.goto("/work?as=u-jgarcia");
  const rail = page.getByRole("navigation").first();
  await expect(rail.getByRole("link", { name: "My work" })).toBeVisible();
  await expect(rail.getByRole("link", { name: "Studio" })).toHaveCount(0);
  await page.goto("/audit?as=u-ccampos");
  await expect(page.getByRole("navigation").first().getByRole("link", { name: "Audit" })).toBeVisible();
  await expect(page.getByRole("navigation").first().getByRole("link", { name: "Studio" })).toHaveCount(0);
});
