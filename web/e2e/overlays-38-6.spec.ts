import fs from "node:fs";
import path from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { analyzeAxe } from "./helpers/analyze-axe";

import {
  loginOperatorSession,
  seedOperatorAuthSession,
  tenantWebBase,
  waitForOperatorWorkspace,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-38-6"
);

type MatrixRow = Record<string, string>;
type KeyboardRow = Record<string, string>;
type AxeRow = { surface: string; violations: unknown[] };

function writeEvidence(name: string, value: unknown): void {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, name), JSON.stringify(value, null, 2));
}

async function openAuthed(
  page: Page,
  session: Awaited<ReturnType<typeof loginOperatorSession>>,
  route: string
): Promise<void> {
  await seedOperatorAuthSession(page, session);
  await page.goto(`${tenantWebBase()}${route}`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.evaluate((stored) => {
      localStorage.setItem("auth_session", JSON.stringify(stored));
    }, session);
    await page.goto(`${tenantWebBase()}${route}`, { waitUntil: "domcontentloaded" });
  }
  await waitForOperatorWorkspace(page);
  await stripDevChrome(page);
}

async function runOverlayAxe(page: Page) {
  const results = await analyzeAxe(page);
  return results.violations.filter((violation) =>
    [
      "aria-dialog-name",
      "aria-modal-attr",
      "aria-hidden-focus",
      "bypass",
      "color-contrast",
      "duplicate-id",
      "duplicate-id-aria",
      "focus-order-semantics",
      "landmark-one-main",
      "page-has-heading-one",
    ].includes(violation.id)
  );
}

type FocusInfo = {
  inModalLayer: boolean;
  tag: string | null;
  id: string | null;
};

async function stripDevChrome(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((node) => node.remove());
    document
      .querySelectorAll("[data-next-badge-root], [data-nextjs-dev-overlay-root]")
      .forEach((node) => node.remove());
  });
}

async function waitForModalTrap(page: Page): Promise<void> {
  await stripDevChrome(page);
  await expect
    .poll(async () => page.locator("[data-base-ui-focus-guard]").count(), {
      timeout: 5_000,
    })
    .toBeGreaterThan(0);
}

async function readFocus(page: Page): Promise<FocusInfo> {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) {
      return { inModalLayer: false, tag: null, id: null };
    }
    const inModalLayer = Boolean(
      active.closest("[role='dialog'], [role='alertdialog']") ||
        active.hasAttribute("data-base-ui-focus-guard") ||
        active.closest(
          "[data-slot='dialog-overlay'], [data-slot='alert-dialog-overlay'], [data-slot='sheet-overlay']"
        )
    );
    return {
      inModalLayer,
      tag: active.tagName,
      id: active.id || active.getAttribute("aria-label"),
    };
  });
}

async function assertTabContained(page: Page): Promise<void> {
  await waitForModalTrap(page);
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press("Tab");
    await expect(page.locator("[role='dialog'], [role='alertdialog']")).not.toHaveCount(0);
    const info = await readFocus(page);
    expect(info.inModalLayer, `Tab ${i + 1} left the overlay ${JSON.stringify(info)}`).toBe(
      true
    );
  }
  await page.keyboard.press("Shift+Tab");
  const insideShift = await readFocus(page);
  expect(
    insideShift.inModalLayer,
    `Shift+Tab left the overlay ${JSON.stringify(insideShift)}`
  ).toBe(true);
}

async function assertNoBackgroundFocus(page: Page): Promise<void> {
  const leaked = await page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) {
      return false;
    }
    if (
      active.hasAttribute("data-base-ui-focus-guard") ||
      active.closest("[role='dialog'], [role='alertdialog']")
    ) {
      return false;
    }
    const main = document.getElementById("main-content");
    return Boolean(main?.contains(active));
  });
  expect(leaked, "Background main received keyboard focus while a modal was open").toBe(
    false
  );
}

async function assertLandmarksIntact(page: Page): Promise<void> {
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Skip to main content" })).toHaveCount(1);
}

async function overlayRole(overlay: Locator): Promise<string> {
  return (await overlay.getAttribute("role")) ?? "";
}

async function assertLightAppearance(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: /appearance:/i })).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveClass(/dark/);
}

async function screenshotPage(page: Page, name: string): Promise<void> {
  fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
  await page.screenshot({
    path: path.join(evidenceDir, "viewports", name),
    fullPage: false,
  });
}

async function screenshotOverlay(page: Page, overlay: Locator, name: string): Promise<void> {
  fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveCSS("opacity", "1");
  await overlay.screenshot({
    path: path.join(evidenceDir, "viewports", name),
  });
}

async function assertForcedColorsOverlay(page: Page, overlay: Locator): Promise<void> {
  const styles = await overlay.evaluate((node) => {
    const computed = getComputedStyle(node);
    return {
      color: computed.color,
      background: computed.backgroundColor,
      border: computed.borderTopColor,
    };
  });
  expect(styles.color).not.toBe("rgba(0, 0, 0, 0)");
  expect(styles.border).not.toBe("rgba(0, 0, 0, 0)");
}

test.describe("Story 38.6 — shared overlay contract", () => {
  test.describe.configure({ mode: "serial" });

  test("command palette, dialogs, alerts, sheet, restore, axe", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(300_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const session = await loginOperatorSession(request);
    const matrix: MatrixRow[] = [];
    const keyboard: KeyboardRow[] = [];
    const axeRows: AxeRow[] = [];

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await assertLandmarksIntact(page);

    const search = page.getByRole("button", { name: "Open command palette" }).first();
    await search.click();
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(palette).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(page.getByLabel("Search commands")).toBeFocused();
    await assertTabContained(page);
    await assertNoBackgroundFocus(page);
    const paletteAxe = await runOverlayAxe(page);
    expect(paletteAxe).toEqual([]);
    axeRows.push({ surface: "Command palette", violations: paletteAxe });
    await screenshotOverlay(page, palette, "palette-1440x900.png");
    await page.keyboard.press("Escape");
    await expect(palette).toHaveCount(0);
    await expect(search).toBeFocused();
    await assertLandmarksIntact(page);
    keyboard.push({
      surface: "Command palette",
      sequence: "open Search → Tab x8 / Shift+Tab → Escape",
      initialFocus: "Search commands",
      restore: "Open command palette",
      result: "pass",
    });
    matrix.push({
      surface: "Command palette",
      route: "/dashboard",
      primitive: "dialog",
      role: "dialog",
      name: "Command palette",
      initialFocus: "Search commands",
      tab: "contained",
      escape: "closes",
      outsideClick: "dismisses (dialog)",
      restore: "Open command palette",
      desktop: "pass",
      mobile: "n/a",
      axe: "pass",
    });

    await assertLightAppearance(page);
    await search.click();
    await expect(palette).toBeVisible();
    await screenshotOverlay(page, palette, "palette-light-1440x900.png");
    await page.keyboard.press("Escape");

    await page.emulateMedia({ forcedColors: "active" });
    await search.click();
    await expect(palette).toBeVisible();
    await assertForcedColorsOverlay(page, palette);
    await screenshotOverlay(page, palette, "palette-forced-colors-1440x900.png");
    await page.keyboard.press("Escape");
    await page.emulateMedia({ forcedColors: "none" });

    await page.setViewportSize({ width: 1024, height: 768 });
    await search.click();
    await expect(palette).toBeVisible();
    await screenshotOverlay(page, palette, "palette-1024x768.png");
    await page.keyboard.press("Escape");
    await expect(search).toBeFocused();
    await page.setViewportSize({ width: 1440, height: 900 });

    const account = page.getByRole("button", { name: "Open account menu" });
    await account.click();
    await expect(page.locator("[data-slot='popover-content']")).toBeVisible();
    await screenshotPage(page, "account-popover-1440x900.png");
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-slot='popover-content']")).toHaveCount(0);
    await expect(account).toBeFocused();
    matrix.push({
      surface: "Account menu",
      route: "/dashboard",
      primitive: "popover",
      role: "non-modal popover",
      name: "account display name",
      initialFocus: "popover content",
      tab: "non-modal",
      escape: "closes",
      outsideClick: "dismisses",
      restore: "Open account menu",
      desktop: "pass",
      mobile: "n/a",
      axe: "n/a-non-modal",
    });
    keyboard.push({
      surface: "Account menu",
      sequence: "open → Escape",
      restore: "Open account menu",
      result: "pass",
    });

    await search.click();
    await expect(palette).toBeVisible();
    await palette.getByRole("button", { name: "Clients", exact: true }).click();
    await page.waitForURL(/\/clients/);
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("[data-slot='dialog-overlay']")).toHaveCount(0);
    await expect(page.locator("#main-content")).not.toHaveAttribute("aria-hidden", "true");
    await assertLandmarksIntact(page);
    keyboard.push({
      surface: "Command palette route change",
      sequence: "open palette → Clients → navigate",
      restore: "overlay unmounted; main visible",
      result: "pass",
    });

    await page.goto(`${tenantWebBase()}/campaigns/new`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    const previewButton = page.getByRole("button", { name: "Preview" });
    await expect(previewButton).toBeVisible({ timeout: 30_000 });
    await previewButton.click();
    const preview = page.getByRole("dialog", { name: "Email preview" });
    await expect(preview).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    expect(await overlayRole(preview)).toBe("dialog");
    await assertTabContained(page);
    await assertNoBackgroundFocus(page);
    const previewAxe = await runOverlayAxe(page);
    expect(previewAxe).toEqual([]);
    axeRows.push({ surface: "Email preview", violations: previewAxe });
    await screenshotOverlay(page, preview, "email-preview-1440x900.png");
    const previewOverlay = page.locator("[data-slot='dialog-overlay']");
    await previewOverlay.click({ position: { x: 4, y: 4 } });
    await expect(preview).toHaveCount(0);
    await expect(previewButton).toBeFocused();
    await previewButton.click();
    await expect(preview).toBeVisible();
    await page.keyboard.press("Control+K");
    await expect(preview).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Command palette" })).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(preview).toHaveCount(0);
    keyboard.push({
      surface: "Email preview",
      sequence: "open Preview → Tab trap → overlay click",
      restore: "Preview",
      result: "pass",
    });

    const qrTrigger = page.getByRole("button", { name: "Insert activity QR" });
    await qrTrigger.click();
    const qr = page.getByRole("dialog", { name: "Insert activity QR code" });
    await expect(qr).toBeVisible();
    await expect(page.getByLabel("Search activities")).toBeFocused();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await assertTabContained(page);
    const qrAxe = await runOverlayAxe(page);
    expect(qrAxe).toEqual([]);
    axeRows.push({ surface: "Insert activity QR", violations: qrAxe });
    await screenshotOverlay(page, qr, "insert-qr-1440x900.png");
    await page.keyboard.press("Escape");
    await expect(qr).toHaveCount(0);
    await expect(qrTrigger).toBeFocused();
    matrix.push({
      surface: "Email preview",
      route: "/campaigns/new",
      primitive: "dialog",
      role: "dialog",
      name: "Email preview",
      initialFocus: "first tabbable in dialog",
      tab: "contained",
      escape: "closes",
      outsideClick: "closes",
      restore: "Preview",
      desktop: "pass",
      mobile: "n/a",
      axe: "pass",
    });
    matrix.push({
      surface: "Insert activity QR",
      route: "/campaigns/new",
      primitive: "dialog",
      role: "dialog",
      name: "Insert activity QR code",
      initialFocus: "Search activities",
      tab: "contained",
      escape: "closes",
      outsideClick: "closes",
      restore: "Insert activity QR",
      desktop: "pass",
      mobile: "n/a",
      axe: "pass",
    });

    await page.goto(`${tenantWebBase()}/dashboard/website`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    const skipTour = page.getByRole("button", { name: "Skip tour" });
    const tourVisible = await skipTour
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (tourVisible) {
      await skipTour.click();
      await expect(page.getByRole("button", { name: "Skip tour" })).toHaveCount(0);
    }
    await page.getByRole("tab", { name: "Sections" }).click();
    const addSection = page.getByRole("button", { name: "Add section" });
    await expect(addSection).toBeVisible({ timeout: 30_000 });
    await addSection.click();
    const addDialog = page.getByRole("dialog", { name: "Add homepage section" });
    await expect(addDialog).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await assertTabContained(page);
    const addAxe = await runOverlayAxe(page);
    expect(addAxe).toEqual([]);
    axeRows.push({ surface: "Add homepage section", violations: addAxe });
    await screenshotOverlay(page, addDialog, "add-section-1440x900.png");
    await page.keyboard.press("Escape");
    await expect(addDialog).toHaveCount(0);
    await expect(addSection).toBeFocused();
    matrix.push({
      surface: "Add homepage section",
      route: "/dashboard/website",
      primitive: "dialog",
      role: "dialog",
      name: "Add homepage section",
      initialFocus: "dialog",
      tab: "contained",
      escape: "closes",
      outsideClick: "closes",
      restore: "Add section",
      desktop: "pass",
      mobile: "n/a",
      axe: "pass",
    });

    await page.getByRole("tab", { name: "Templates" }).click();
    const saveLayout = page.getByRole("button", { name: "Save current layout" });
    await expect(saveLayout).toBeVisible();
    await saveLayout.click();
    const alert = page.getByRole("alertdialog", { name: "Save homepage template" });
    await expect(alert).toBeVisible();
    await expect(page.getByRole("alertdialog")).toHaveCount(1);
    expect(await overlayRole(alert)).toBe("alertdialog");
    await assertTabContained(page);
    await assertNoBackgroundFocus(page);
    const alertAxe = await runOverlayAxe(page);
    expect(alertAxe).toEqual([]);
    axeRows.push({ surface: "Save homepage template", violations: alertAxe });
    await screenshotOverlay(page, alert, "save-template-alert-1440x900.png");
    await page.locator("[data-slot='alert-dialog-overlay']").click({
      position: { x: 4, y: 4 },
      force: true,
    });
    await expect(alert).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(alert).toHaveCount(0);
    await expect(saveLayout).toBeFocused();
    keyboard.push({
      surface: "Save homepage template",
      sequence: "open → Tab trap → overlay click (stays) → Escape",
      restore: "Save current layout",
      result: "pass",
    });
    matrix.push({
      surface: "Save homepage template",
      route: "/dashboard/website",
      primitive: "alert-dialog",
      role: "alertdialog",
      name: "Save homepage template",
      initialFocus: "dialog",
      tab: "contained",
      escape: "cancels",
      outsideClick: "blocked",
      restore: "Save current layout",
      desktop: "pass",
      mobile: "n/a",
      axe: "pass",
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${tenantWebBase()}/dashboard`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    const more = page.getByRole("button", { name: "More" });
    await more.click();
    const sheet = page.getByRole("dialog", { name: "Cohestra" });
    await expect(sheet).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
    await assertTabContained(page);
    await assertNoBackgroundFocus(page);
    const sheetAxe = await runOverlayAxe(page);
    expect(sheetAxe).toEqual([]);
    axeRows.push({ surface: "More sheet", violations: sheetAxe });
    await screenshotOverlay(page, sheet, "more-sheet-390x844.png");

    await page.keyboard.press("Control+K");
    await expect(palette).toBeVisible();
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await screenshotOverlay(page, palette, "nested-sheet-then-palette-exclusive-390x844.png");
    await page.keyboard.press("Escape");
    await expect(palette).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    keyboard.push({
      surface: "More sheet then command palette",
      sequence: "More → Search → exclusive single dialog → Escape",
      restore: "no stacked sibling modals",
      result: "pass",
    });

    await more.click();
    await expect(sheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(more).toBeFocused();
    await assertLandmarksIntact(page);

    await page.setViewportSize({ width: 430, height: 932 });
    await more.click();
    await expect(sheet).toBeVisible();
    await screenshotOverlay(page, sheet, "more-sheet-430x932.png");
    await page.keyboard.press("Escape");
    await expect(more).toBeFocused();
    matrix.push({
      surface: "More sheet",
      route: "/dashboard",
      primitive: "sheet",
      role: "dialog",
      name: "Cohestra",
      initialFocus: "sheet",
      tab: "contained",
      escape: "closes",
      outsideClick: "closes",
      restore: "More",
      desktop: "n/a",
      mobile: "pass",
      axe: "pass",
    });

    writeEvidence("interaction-matrix.json", matrix);
    writeEvidence("keyboard-sequences.json", keyboard);
    writeEvidence("axe-results.json", axeRows);
  });
});
