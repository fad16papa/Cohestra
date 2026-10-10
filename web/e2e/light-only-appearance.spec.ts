import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { analyzeAxe } from "./helpers/analyze-axe";
import {
  loginOperatorSession,
  loginPlatformAdminSession,
  seedOperatorAuthSession,
  waitForOperatorWorkspace,
  waitForPlatformConsole,
  type OperatorSession,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.join(
  process.cwd(),
  "../_bmad-output/planning-artifacts/evidence/light-only-appearance/viewports"
);

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
] as const;

async function assertLightRoot(page: Page): Promise<void> {
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  expect(scheme).toMatch(/light/);
}

async function assertNoThemeControls(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: /appearance:/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^appearance$/i })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: /^(light|dark|system)$/i })).toHaveCount(0);
  await expect(page.getByText("Match your device settings")).toHaveCount(0);
  await expect(page.getByText("Appearance: System")).toHaveCount(0);
}

async function pageOverflows(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
}

async function seedDarkStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "dark");
    window.localStorage.setItem("cohestra-theme-operator", "dark");
    window.sessionStorage.setItem("cohestra-theme-public-session", "dark");
  });
}

async function openAuthed(page: Page, session: OperatorSession, route: string): Promise<void> {
  await seedOperatorAuthSession(page, session);
  await page.goto(route, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.evaluate((stored) => {
      localStorage.setItem("auth_session", JSON.stringify(stored));
    }, session);
    await page.goto(route, { waitUntil: "domcontentloaded" });
  }
}

test.describe("light-only application appearance", () => {
  test("login and platform login stay light under OS dark and old storage", async ({ page }) => {
    fs.mkdirSync(evidenceDir, { recursive: true });
    await page.emulateMedia({ colorScheme: "dark" });
    await seedDarkStorage(page);

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await assertLightRoot(page);
      await assertNoThemeControls(page);
      expect(await pageOverflows(page)).toBe(false);
      await page.screenshot({
        path: path.join(evidenceDir, `tenant-login-${viewport.name}-prefers-dark.png`),
        fullPage: true,
      });

      await page.goto("/platform/login", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: /platform admin sign in/i })).toBeVisible();
      await assertLightRoot(page);
      await assertNoThemeControls(page);
      await page.screenshot({
        path: path.join(evidenceDir, `platform-login-${viewport.name}-prefers-dark.png`),
        fullPage: true,
      });
    }
  });

  test("forgot-password and public register have no theme control", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await seedDarkStorage(page);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await assertLightRoot(page);
    await assertNoThemeControls(page);

    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await assertLightRoot(page);
    await assertNoThemeControls(page);
    await page.screenshot({
      path: path.join(evidenceDir, "register-1440-prefers-dark.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await assertLightRoot(page);
    await assertNoThemeControls(page);
    await page.screenshot({
      path: path.join(evidenceDir, "register-390-prefers-dark.png"),
      fullPage: true,
    });
  });

  test("dashboard, settings, and platform stay light when live stack is available", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(evidenceDir, { recursive: true });

    await page.emulateMedia({ colorScheme: "dark" });
    await seedDarkStorage(page);

    const tenant = await loginOperatorSession(request);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openAuthed(page, tenant, "/dashboard");
      await waitForOperatorWorkspace(page);
      await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible({
        timeout: 30_000,
      });
      await assertLightRoot(page);
      await assertNoThemeControls(page);
      expect(await pageOverflows(page)).toBe(false);
      await page.screenshot({
        path: path.join(evidenceDir, `dashboard-${viewport.name}-prefers-dark.png`),
        fullPage: true,
      });

      await openAuthed(page, tenant, "/settings/profile");
      await waitForOperatorWorkspace(page);
      await expect(page.getByRole("heading", { name: "Your account", level: 1 })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Appearance", level: 1 })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Appearance" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Brand accent" })).toBeVisible();
      await assertLightRoot(page);
      await assertNoThemeControls(page);
      await page.screenshot({
        path: path.join(evidenceDir, `settings-${viewport.name}-prefers-dark.png`),
        fullPage: true,
      });
    }

    const platform = await loginPlatformAdminSession(request);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openAuthed(page, platform, "/platform/overview");
      await waitForPlatformConsole(page);
      await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
      await assertLightRoot(page);
      await assertNoThemeControls(page);
      expect(await pageOverflows(page)).toBe(false);
      const axe = await analyzeAxe(page);
      const blocking = axe.violations.filter(
        (violation) => violation.impact === "serious" || violation.impact === "critical"
      );
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
      await page.screenshot({
        path: path.join(evidenceDir, `platform-overview-${viewport.name}-prefers-dark.png`),
        fullPage: true,
      });
    }
  });
});
