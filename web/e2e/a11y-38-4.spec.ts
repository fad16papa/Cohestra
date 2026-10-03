import fs from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  loginOperatorSession,
  seedOperatorAuthSession,
  waitForOperatorWorkspace,
  waitForReportsContent,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-38-4"
);

type AxeViolation = {
  id: string;
  impact: string | null;
  description: string;
  nodes: Array<{ html: string; target: string[]; summary: string }>;
};

async function settleForAxe(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const enter = document.querySelector("[data-admin-route-transition]");
    if (!enter) {
      return;
    }
    const deadline = Date.now() + 1200;
    while (Date.now() < deadline) {
      const opacity = getComputedStyle(enter).opacity;
      const running = enter
        .getAnimations({ subtree: false })
        .some((animation) => animation.playState === "running");
      if (opacity === "1" && !running) {
        return;
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  });
}

async function runAxe(page: Page): Promise<AxeViolation[]> {
  await settleForAxe(page);
  // Inactive controls are WCAG 1.4.3 exempt. Base UI may keep tabindex on
  // aria-disabled submits; exclude them rather than treating opacity-50 as a
  // semantic-token failure.
  const results = await new AxeBuilder({ page })
    .exclude('[disabled]')
    .exclude('[aria-disabled="true"]')
    .exclude('[data-disabled]')
    .analyze();
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact ?? null,
    description: violation.description,
    nodes: violation.nodes.map((node) => ({
      html: node.html.slice(0, 280),
      target: node.target.map(String),
      summary: (node.failureSummary ?? "").slice(0, 400),
    })),
  }));
}

function contrastFailures(violations: AxeViolation[]): AxeViolation[] {
  return violations.filter(
    (violation) =>
      violation.id === "color-contrast" &&
      (violation.impact === "serious" || violation.impact === "critical")
  );
}

test("login axe and forced-colors evidence", async ({ page }) => {
  fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel(/email/i)).toBeVisible();

  const loginViolations = await runAxe(page);
  fs.writeFileSync(
    path.join(evidenceDir, "axe-login.json"),
    JSON.stringify(
      {
        route: "/login",
        viewport: "1440x900",
        violations: loginViolations,
        colorContrastSeriousOrCritical: contrastFailures(loginViolations),
      },
      null,
      2
    )
  );
  expect(contrastFailures(loginViolations), JSON.stringify(loginViolations, null, 2)).toEqual([]);

  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await page.getByLabel(/email/i).focus();
  await page.screenshot({
    path: path.join(evidenceDir, "viewports", "forced-colors-login-1440x900.png"),
    fullPage: true,
  });
});

test("authenticated axe, forced-colors, dark, Basic Website, and client profile", async ({
  page,
  request,
}) => {
  test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
  test.setTimeout(240_000);
  fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

  const origin = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
  const session = await loginOperatorSession(request);
  await seedOperatorAuthSession(page, session);

  const axeReport: Array<{
    route: string;
    viewport: string;
    violations: AxeViolation[];
    colorContrastSeriousOrCritical: AxeViolation[];
  }> = [];
  const gaps: string[] = [];

  const routes = [
    { name: "dashboard", path: "/dashboard", ready: /good (morning|afternoon|evening)/i },
    { name: "clients", path: "/clients", ready: /clients/i },
    { name: "activities", path: "/activities", ready: /activities/i },
    { name: "reports", path: "/reports", ready: null },
    { name: "website-entitled", path: "/dashboard/website", ready: null },
    { name: "settings", path: "/settings", ready: /settings|appearance|workspace/i },
    { name: "billing", path: "/settings/billing", ready: /billing|plan|invoice/i },
    { name: "campaigns", path: "/campaigns", ready: /campaign/i },
  ] as const;

  async function open(path: string): Promise<void> {
    await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
    if (page.url().includes("/login")) {
      await page.evaluate((stored) => {
        localStorage.setItem("auth_session", JSON.stringify(stored));
      }, session);
      await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
    }
    await waitForOperatorWorkspace(page);
  }

  for (const route of routes) {
    try {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open(route.path);
      if (route.name === "website-entitled") {
        await expect(page.locator("#website-builder-toolbar")).toBeVisible({ timeout: 30_000 });
      } else if (route.name === "campaigns") {
        await expect(page.getByRole("heading", { name: "Campaigns", level: 1 })).toBeVisible({
          timeout: 30_000,
        });
      } else if (route.name === "settings") {
        await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible({
          timeout: 30_000,
        });
      } else if (route.name === "clients") {
        await expect(page.getByRole("heading", { name: "Clients", level: 1 })).toBeVisible({
          timeout: 30_000,
        });
      } else if (route.name === "activities") {
        await expect(page.getByRole("heading", { name: "Activities", level: 1 })).toBeVisible({
          timeout: 30_000,
        });
      } else if (route.name === "reports") {
        await waitForReportsContent(page);
      } else if (route.ready) {
        await expect(page.getByText(route.ready).first()).toBeVisible({ timeout: 30_000 });
      }
      const violations = await runAxe(page);
      axeReport.push({
        route: route.path,
        viewport: "1440x900",
        violations,
        colorContrastSeriousOrCritical: contrastFailures(violations),
      });
    } catch (error) {
      gaps.push(`${route.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open("/activities");
    await expect(page.getByText(/activities/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/activities/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('a[href^="/activities/"][href*="-"]').first()).toBeVisible({
      timeout: 30_000,
    });
    const activityHref = await page.locator("a[href]").evaluateAll((elements) => {
      const href = elements
        .map((element) => element.getAttribute("href"))
        .find(
          (value) =>
            Boolean(value) &&
            /\/activities\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
              value ?? ""
            ) &&
            !value?.includes("/communities/")
        );
      return href ?? null;
    });
    if (!activityHref) {
      gaps.push("form-studio: no activity UUID link on /activities");
    } else {
      await page.goto(`${origin}${activityHref}`, { waitUntil: "domcontentloaded" });
      await waitForOperatorWorkspace(page);
      const formTab = page.getByRole("tab", { name: "Form", exact: true });
      await expect(formTab).toBeVisible({ timeout: 30_000 });
      await formTab.click();
      await expect(formTab).toHaveAttribute("aria-selected", "true");
      const violations = await runAxe(page);
      axeReport.push({
        route: `${activityHref}#form-studio`,
        viewport: "1440x900",
        violations,
        colorContrastSeriousOrCritical: contrastFailures(violations),
      });
    }
  } catch (error) {
    gaps.push(`form-studio: ${error instanceof Error ? error.message : String(error)}`);
  }

  let clientHref: string | null = null;
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open("/clients");
    await expect(page.getByRole("heading", { name: "Clients", level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await expect
      .poll(async () => page.locator('a[href*="/clients/"]').count(), { timeout: 30_000 })
      .toBeGreaterThan(0);
    clientHref = await page.locator("a[href]").evaluateAll((elements) => {
      const href = elements
        .map((element) => element.getAttribute("href"))
        .find((value) => value && /^\/clients\/[0-9a-f-]{36}(?:\?.*)?$/i.test(value));
      return href ?? null;
    });
    if (!clientHref) {
      gaps.push("client-profile: no client UUID link on /clients");
    } else {
      await page.goto(`${origin}${clientHref}`, { waitUntil: "domcontentloaded" });
      await waitForOperatorWorkspace(page);
      await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 30_000 });
      const violations = await runAxe(page);
      axeReport.push({
        route: clientHref,
        viewport: "1440x900",
        violations,
        colorContrastSeriousOrCritical: contrastFailures(violations),
      });
      await page.screenshot({
        path: path.join(evidenceDir, "viewports", "client-profile-1440x900.png"),
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: path.join(evidenceDir, "viewports", "client-profile-390x844.png"),
        fullPage: true,
      });
    }
  } catch (error) {
    gaps.push(`client-profile: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const basicEmail = process.env.E2E_BASIC_EMAIL ?? "px2-basic-admin@cohestra.local";
    const basicPassword = process.env.E2E_BASIC_PASSWORD ?? "ChangeMe123!";
    const basicSlug = process.env.E2E_BASIC_SLUG ?? "px2-basic";
    const basicSession = await loginOperatorSession(request, {
      slug: basicSlug,
      email: basicEmail,
      password: basicPassword,
    });
    const basicOrigin = (() => {
      const url = new URL(origin);
      url.hostname = `${basicSlug}.localhost`;
      return url.origin;
    })();
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });
    await page.context().clearCookies();
    await page.addInitScript((stored) => {
      localStorage.setItem("auth_session", JSON.stringify(stored));
    }, basicSession);
    for (const viewport of [
      { name: "1440x900", width: 1440, height: 900 },
      { name: "390x844", width: 390, height: 844 },
    ] as const) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`${basicOrigin}/dashboard/website`, { waitUntil: "domcontentloaded" });
      if (page.url().includes("/login")) {
        await page.goto(`${basicOrigin}/login`, { waitUntil: "domcontentloaded" });
        await page.getByLabel("Email address").fill(basicEmail);
        await page.getByLabel("Password", { exact: true }).fill(basicPassword);
        await page.getByRole("button", { name: /sign in to workspace/i }).click();
        await waitForOperatorWorkspace(page);
        await page.goto(`${basicOrigin}/dashboard/website`, { waitUntil: "domcontentloaded" });
      }
      await waitForOperatorWorkspace(page);
      await expect(
        page.getByRole("heading", { name: /unlock a branded public homepage/i })
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.locator("#website-builder-toolbar")).toHaveCount(0);
      await expect(page.getByRole("button", { name: /try again/i })).toHaveCount(0);
      const upgrade = page.getByRole("link", { name: /continue to checkout|upgrade/i }).first();
      if (await upgrade.count()) {
        await upgrade.focus();
      }
      await page.screenshot({
        path: path.join(evidenceDir, "viewports", `website-basic-lock-${viewport.name}.png`),
        fullPage: true,
      });
    }
    const lockViolations = await runAxe(page);
    axeReport.push({
      route: "/dashboard/website (px2-basic lock)",
      viewport: "390x844",
      violations: lockViolations,
      colorContrastSeriousOrCritical: contrastFailures(lockViolations),
    });
    expect(pageErrors).toEqual([]);
  } catch (error) {
    gaps.push(
      `basic-website: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  try {
    await seedOperatorAuthSession(page, session);
    await page.setViewportSize({ width: 1440, height: 900 });
    await open("/dashboard");
    await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("button", { name: /appearance:/i }).click();
    await page.getByRole("radio", { name: /^dark$/i }).click();
    await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 15_000 });
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "dashboard-1440x900-dark.png"),
      fullPage: true,
    });
    await open("/reports");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await waitForReportsContent(page);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "reports-1440x900-dark.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: /appearance:/i }).click();
    await page.getByRole("radio", { name: /^light$/i }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/, { timeout: 15_000 });
  } catch (error) {
    gaps.push(`dark-product: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    await page.emulateMedia({ forcedColors: "active" });
    await page.addInitScript(() => {
      localStorage.setItem("cohestra-theme-operator", "light");
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await open("/dashboard");
    await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible({
      timeout: 30_000,
    });
    await page.locator("a, button").first().focus();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "forced-colors-dashboard-1440x900.png"),
      fullPage: true,
    });
    await open("/settings");
    const emailOrInput = page.locator("input, textarea, button").first();
    await emailOrInput.focus();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "forced-colors-settings-form-1440x900.png"),
      fullPage: true,
    });
  } catch (error) {
    gaps.push(`forced-colors-product: ${error instanceof Error ? error.message : String(error)}`);
  }

  fs.writeFileSync(
    path.join(evidenceDir, "axe-routes.json"),
    JSON.stringify({ generated: new Date().toISOString(), routes: axeReport, gaps }, null, 2)
  );

  const contrastHits = axeReport.flatMap((entry) =>
    entry.colorContrastSeriousOrCritical.map((violation) => ({
      route: entry.route,
      ...violation,
    }))
  );
  expect(contrastHits, JSON.stringify(contrastHits, null, 2)).toEqual([]);
  expect(gaps, gaps.join("\n")).toEqual([]);
});
