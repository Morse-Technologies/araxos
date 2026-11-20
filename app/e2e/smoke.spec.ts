import { expect, test, type Page } from "@playwright/test";

const ROUTES = [
  ["/queue", "Bandeja"], ["/queue/n-482", "Conservas del Cantábrico"], ["/queue/n-482/diff", "Volver a la nota"],
  ["/history", "Historial"], ["/history/audit", "Verificar la cadena"],
  ["/admin/connectors", "Odoo 19"], ["/admin/actions", "Parte de trabajo"], ["/admin/vocabulary", "Suministros Frío Norte"],
  ["/admin/users", "Carmen Ortega"], ["/admin/settings", "Reducir transparencia"],
  ["/m", "Hola, Javier"], ["/m/record", "Grabar nota"], ["/m/review/n-480", "Hornos Hermanos Ruiz"], ["/m/car", "Modo coche"], ["/m/history", "Tus notas"],
] as const;

const go = (page: Page, path: string) => page.goto(`${path}${path.includes("?") ? "&" : "?"}fast`);

for (const [path, text] of ROUTES) {
  test(`renders ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await go(page, path);
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("/ and /admin redirect", async ({ page }) => {
  await go(page, "/");
  await expect(page).toHaveURL(/\/queue/);
  await go(page, "/admin");
  await expect(page).toHaveURL(/\/admin\/connectors/);
});

test("theme toggle switches light and dark", async ({ page }) => {
  await go(page, "/queue");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "light");
  await page.getByTestId("theme-toggle").click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
});

test("reduce transparency turns glass solid", async ({ page }) => {
  await go(page, "/queue/n-482");
  const glass = page.locator(".glass").first();
  await expect.poll(() => glass.evaluate((el) => getComputedStyle(el).backdropFilter)).not.toBe("none");
  await page.getByTestId("transparency-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-transparency", "reduced");
  await expect.poll(() => glass.evaluate((el) => getComputedStyle(el).backdropFilter)).toBe("none");
});

test("approve flow: answer, fix the conflict, approve, undo", async ({ page }) => {
  await go(page, "/queue/n-482");
  const approve = page.getByTestId("approve");
  await expect(approve).toBeDisabled();
  await page.getByRole("button", { name: /JF-3025/ }).click();
  await expect(page.getByTestId("dock-summary")).toContainText("conflicto");
  await page.getByRole("button", { name: "Mover a las 11:00" }).click();
  await expect(page.getByTestId("dock-summary")).toContainText("Creará 4 registros en Odoo y 1 evento en Google Calendar");
  await expect(page.getByText("21,90 €").first()).toBeVisible();
  await approve.click();
  await expect(page.getByTestId("note-detail")).toHaveAttribute("data-state", "applied");
  await expect(page.getByTestId("stamp")).toBeVisible();
  await expect(page.locator('[data-row="n-482"]')).toHaveCount(0);
  await page.getByTestId("dock").getByRole("button", { name: "Deshacer" }).click();
  await expect(page.getByTestId("note-detail")).toHaveAttribute("data-state", "ready");
  await expect(page.locator('[data-row="n-482"]')).toHaveCount(1);
});

test("keyboard: J moves, A approves, R opens reject", async ({ page }) => {
  await go(page, "/queue/n-485");
  await expect(page.locator('[data-row="n-482"]')).toBeVisible();
  await page.keyboard.press("j");
  await expect(page).toHaveURL(/n-482/);
  await page.keyboard.press("j");
  await expect(page).toHaveURL(/n-481/);
  await page.keyboard.press("j");
  await expect(page).toHaveURL(/n-480/);
  await expect(page.getByTestId("note-detail")).toContainText("Hornos Hermanos Ruiz");
  await page.keyboard.press("r");
  await expect(page.getByRole("dialog", { name: "Rechazar la nota" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("a");
  await expect(page.getByTestId("note-detail")).toHaveAttribute("data-state", "applied");
});

test("double signature above 3.000 €", async ({ page }) => {
  await go(page, "/queue/n-481");
  await page.getByTestId("approve").click();
  await expect(page.getByTestId("note-detail")).toHaveAttribute("data-state", "awaiting_second");
  await page.getByRole("button", { name: /Firmar como Rosa/ }).click();
  await expect(page.getByTestId("note-detail")).toHaveAttribute("data-state", "applied");
});

test("correcting an entity rewrites its fields and teaches an alias", async ({ page }) => {
  await go(page, "/queue/n-482");
  await page.locator('[data-entity="e1"]').click();
  await page.getByRole("radio", { name: /Laredo/ }).click();
  await page.getByLabel(/Recordar como alias/).check();
  await page.getByRole("button", { name: "Usar esta" }).click();
  await expect(page.locator('[data-action="n-482-a1"]')).toContainText("Conservas del Cantábrico (Laredo)");
  await page.getByRole("link", { name: "Administración" }).click();
  await page.getByRole("link", { name: "Vocabulario" }).click();
  await expect(page.getByText("Conservas del Cantábrico (Laredo)")).toBeVisible();
});

test("command palette opens a note", async ({ page }) => {
  await go(page, "/history");
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox").fill("Talleres");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/queue\/n-481/);
});

test("audit chain verifies", async ({ page }) => {
  await go(page, "/history/audit");
  await page.getByTestId("verify").click();
  await expect(page.getByRole("status")).toContainText("Cadena íntegra");
});

test("phone: record with the microphone, review and send", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await go(page, "/m/record");
  await page.getByTestId("scenario").selectOption("marta-hornos");
  await page.getByTestId("record").click();
  await expect(page.getByTestId("mic-source")).toContainText("Micrófono");
  await expect(page.getByTestId("live-transcript")).toContainText("Soy Marta", { timeout: 8000 });
  await page.getByTestId("stop").click();
  await expect(page.getByTestId("understanding")).toBeVisible();
  await expect(page).toHaveURL(/\/m\/review\/n-486/);
  await page.getByTestId("send").click();
  await expect(page).toHaveURL(/\/m\/history/);
  await expect(page.getByTestId("m-note").first()).toContainText("Hornos Hermanos Ruiz");
});

test("phone: car mode reads back and sends", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await go(page, "/m/car");
  await page.getByTestId("car-record").click();
  await page.waitForTimeout(800);
  await page.getByTestId("car-record").click();
  await page.getByTestId("car-yes").click();
  await expect(page.getByRole("status")).toContainText("Nota enviada");
});
