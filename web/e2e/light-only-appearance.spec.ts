import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { analyzeAxe } from "./helpers/analyze-axe";
import {
  loginOperatorSession,
  loginPlatformAdminSession,
  seedOperatorAuthSession,
  tenantWebBase,
  waitForOperatorWorkspace,
  waitForPlatformConsole,
  type OperatorSession,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.join(
  process.cwd(),
  "../_bmad-output/planning-artifacts/evidence/platform-admin-light-only/viewports"
);

const OPERATOR_THEME_KEY = "cohestra-theme-operator";
const PUBLIC_THEME_KEY = "cohestra-theme-public-session";

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
] as const;

async function assertLightRoot(page: Page): Promise<void> {
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  expect(scheme).toMatch(/light/);
}

async function assertDarkRoot(page: Page): Promise<void> {
  await expect(page.locator("html")).toHaveClass(/dark/);
  const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  expect(scheme).toMatch(/dark/);
}

async function assertNoThemeControls(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: /appearance:/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^appearance$/i })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: /^(light|dark|system)$/i })).toHaveCount(0);
}

async function pageOverflows(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
}

async function seedOperatorTheme(page: Page, preference: "light" | "dark" | "system"): Promise<void> {
  await page.addInitScript(
    ({ key, preference: stored }) => {
      window.localStorage.setItem(key, stored);
      window.localStorage.setItem("theme", stored);
    },
    { key: OPERATOR_THEME_KEY, preference }
  );
}

async function seedPublicTheme(page: Page, preference: "light" | "dark" | "system"): Promise<void> {
  await page.addInitScript(
    ({ key, preference: stored }) => {
      window.sessionStorage.setItem(key, stored);
    },
    { key: PUBLIC_THEME_KEY, preference }
  );
}

async function installDarkFlashProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as Window & { __sawHtmlDark?: boolean }).__sawHtmlDark = false;
    const record = () => {
      if (document.documentElement?.classList.contains("dark")) {
        (window as Window & { __sawHtmlDark?: boolean }).__sawHtmlDark = true;
      }
    };
    const start = () => {
      record();
      new MutationObserver(record).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    };
    if (document.documentElement) {
      start();
    } else {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    }
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

async function selectAdminTheme(page: Page, option: "Light" | "Dark" | "System"): Promise<void> {
  await page.getByRole("button", { name: /appearance:/i }).click();
  await page.getByRole("radio", { name: new RegExp(`^${option}$`, "i") }).click();
}

async function selectPublicTheme(page: Page, option: "Light" | "Dark" | "System"): Promise<void> {
  const toggle = page.getByRole("button", { name: /appearance/i }).first();
  await expect(toggle).toBeVisible();
  await toggle.click();
  await page.getByRole("radio", { name: new RegExp(`^${option}$`, "i") }).click();
}

test.describe("PlatformAdmin light-only + tenant theme preservation", () => {
  test("E: platform login stays light under OS dark and stored dark", async ({ page }) => {
    fs.mkdirSync(evidenceDir, { recursive: true });
    await page.emulateMedia({ colorScheme: "dark" });
    await seedOperatorTheme(page, "dark");
    await seedPublicTheme(page, "dark");
    await installDarkFlashProbe(page);

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/platform/login", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: /platform admin sign in/i })).toBeVisible();
      await assertLightRoot(page);
      await assertNoThemeControls(page);
      const sawDark = await page.evaluate(
        () => Boolean((window as Window & { __sawHtmlDark?: boolean }).__sawHtmlDark)
      );
      expect(sawDark, "platform login first-paint flash").toBe(false);
      expect(
        await page.evaluate((key) => localStorage.getItem(key), OPERATOR_THEME_KEY)
      ).toBe("dark");
      await page.screenshot({
        path: path.join(evidenceDir, `platform-login-${viewport.name}-prefers-dark.png`),
        fullPage: true,
      });
    }
  });

  test("tenant login keeps ThemeToggle and can resolve dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await seedPublicTheme(page, "dark");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /appearance/i }).first()).toBeVisible();
    await assertDarkRoot(page);
  });

  test("A-D + ops/support: Platform console stays light and ignores stored/OS dark", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(evidenceDir, { recursive: true });

    await page.emulateMedia({ colorScheme: "dark" });
    await seedOperatorTheme(page, "dark");
    await installDarkFlashProbe(page);

    const platform = await loginPlatformAdminSession(request);
    const appearancePatches: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "PATCH" && /\/appearance\b/.test(req.url())) {
        appearancePatches.push(req.postData() ?? "");
      }
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, platform, "/platform/overview");
    await waitForPlatformConsole(page);
    await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
    await assertLightRoot(page);
    await assertNoThemeControls(page);
    expect(await pageOverflows(page)).toBe(false);
    const sawDark = await page.evaluate(
      () => Boolean((window as Window & { __sawHtmlDark?: boolean }).__sawHtmlDark)
    );
    expect(sawDark, "platform overview first-paint flash").toBe(false);
    expect(await page.evaluate((key) => localStorage.getItem(key), OPERATOR_THEME_KEY)).toBe("dark");
    expect(appearancePatches.join(" ")).not.toMatch(/"themePreference"\s*:\s*"light"/);
    const axeOverview = await analyzeAxe(page);
    const blockingOverview = axeOverview.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical"
    );
    expect(blockingOverview, JSON.stringify(blockingOverview, null, 2)).toEqual([]);
    await page.screenshot({
      path: path.join(evidenceDir, "platform-overview-1440-prefers-dark.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/platform/overview", { waitUntil: "domcontentloaded" });
    await waitForPlatformConsole(page);
    await assertLightRoot(page);
    await page.screenshot({
      path: path.join(evidenceDir, "platform-overview-390-prefers-dark.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/platform/ops", { waitUntil: "domcontentloaded" });
    await waitForPlatformConsole(page);
    await assertLightRoot(page);
    await assertNoThemeControls(page);
    await page.screenshot({
      path: path.join(evidenceDir, "platform-ops-1440-prefers-dark.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/platform/support", { waitUntil: "domcontentloaded" });
    await waitForPlatformConsole(page);
    await assertLightRoot(page);
    await assertNoThemeControls(page);
    await page.screenshot({
      path: path.join(evidenceDir, "platform-support-390-prefers-dark.png"),
      fullPage: true,
    });

    expect(await page.evaluate((key) => localStorage.getItem(key), OPERATOR_THEME_KEY)).toBe("dark");
    expect(appearancePatches.join(" ")).not.toMatch(/"themePreference"\s*:\s*"light"/);
  });

  test("F-J + route-transition: tenant themes survive a Platform visit", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(evidenceDir, { recursive: true });

    const tenant = await loginOperatorSession(request);
    const appearancePatches: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "PATCH" && /\/appearance\b/.test(req.url())) {
        appearancePatches.push(req.postData() ?? "");
      }
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, tenant, "/dashboard");
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: /appearance:/i })).toBeVisible();

    await selectAdminTheme(page, "Dark");
    await expect
      .poll(async () => page.locator("html").getAttribute("class"))
      .toMatch(/dark/);
    await assertDarkRoot(page);
    await page.screenshot({
      path: path.join(evidenceDir, "tenant-dashboard-1440-dark.png"),
      fullPage: true,
    });
    const storedAfterDark = await page.evaluate((key) => localStorage.getItem(key), OPERATOR_THEME_KEY);
    expect(storedAfterDark).toBe("dark");

    await page.goto("/platform/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /platform admin sign in/i })).toBeVisible();
    await assertLightRoot(page);
    await assertNoThemeControls(page);
    expect(await page.evaluate((key) => localStorage.getItem(key), OPERATOR_THEME_KEY)).toBe("dark");

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    await assertDarkRoot(page);
    expect(await page.evaluate((key) => localStorage.getItem(key), OPERATOR_THEME_KEY)).toBe("dark");
    expect(appearancePatches.join(" ")).not.toMatch(/"themePreference"\s*:\s*"light"/);

    await selectAdminTheme(page, "Light");
    await expect
      .poll(async () => page.locator("html").getAttribute("class"))
      .not.toMatch(/dark/);
    await assertLightRoot(page);
    await page.screenshot({
      path: path.join(evidenceDir, "tenant-dashboard-1440-light.png"),
      fullPage: true,
    });

    const axeLight = await analyzeAxe(page);
    const blockingLight = axeLight.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical"
    );
    expect(blockingLight, JSON.stringify(blockingLight, null, 2)).toEqual([]);

    await selectAdminTheme(page, "System");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect
      .poll(async () => page.locator("html").getAttribute("class"))
      .toMatch(/dark/);
    await assertDarkRoot(page);

    const axeDark = await analyzeAxe(page);
    const blockingDark = axeDark.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical"
    );
    expect(blockingDark, JSON.stringify(blockingDark, null, 2)).toEqual([]);

    await page.emulateMedia({ colorScheme: "light" });
    await openAuthed(page, tenant, "/settings/appearance");
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: "Appearance", level: 1 })).toBeVisible();
    await expect(page.getByRole("radio", { name: /^light$/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /^dark$/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /^system$/i })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "settings-appearance-1440.png"),
      fullPage: true,
    });
  });

  test("K-L: public registration and tenant website keep ThemeToggle", async ({ page }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    fs.mkdirSync(evidenceDir, { recursive: true });
    const origin = tenantWebBase();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${origin}/register/demo-marina-social-meetup`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("[data-registration-layout-container='public']")).toBeVisible();
    await expect(page.getByRole("button", { name: /appearance/i }).first()).toBeVisible();
    await selectPublicTheme(page, "Dark");
    await expect
      .poll(async () => page.locator("html").getAttribute("class"))
      .toMatch(/dark/);
    await page.screenshot({
      path: path.join(evidenceDir, "public-registration-1440-dark.png"),
      fullPage: true,
    });

    await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /appearance/i }).first()).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "tenant-website-1440.png"),
      fullPage: true,
    });
  });
});
