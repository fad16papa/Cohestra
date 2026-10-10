import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page, type Route } from "@playwright/test";

import { analyzeAxe } from "./helpers/analyze-axe";
import {
  loginOperatorSession,
  loginPlatformAdminSession,
  seedOperatorAuthSession,
  waitForPlatformConsole,
  type OperatorSession,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-44-9"
);

const SHA = "abcdef0123456789abcdef0123456789abcdef01";
const OBSERVED = "2026-10-10T04:19:00Z";

function kpi(value: unknown, overrides: Record<string, unknown> = {}) {
  return {
    value,
    source: "GIT_SHA",
    observedAt: OBSERVED,
    freshness: "actual",
    ...overrides,
  };
}

function versionPayload(overrides: Record<string, unknown> = {}) {
  return {
    gitSha: kpi(SHA),
    environmentName: kpi("Production", { source: "IHostEnvironment.EnvironmentName" }),
    apiVersion: kpi("v1", { source: "API contract v1" }),
    ...overrides,
  };
}

const missingVersion = versionPayload({
  gitSha: kpi(null, { source: "Not instrumented", freshness: "missing_instrumentation" }),
});

async function openPlatform(page: Page, session: OperatorSession, route: string): Promise<void> {
  await seedOperatorAuthSession(page, session);
  await page.evaluate((stored) => {
    localStorage.setItem("auth_session", JSON.stringify(stored));
  }, session);
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await waitForPlatformConsole(page);
  if (page.url().includes("/login")) {
    await page.getByLabel("Email address").fill("platform-admin@cohestra.local");
    await page.getByRole("textbox", { name: "Password" }).fill("ChangeMe123!");
    await page.getByRole("button", { name: "Sign in to platform console" }).click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 });
    if (!page.url().includes(route.split("?")[0] ?? route)) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await waitForPlatformConsole(page);
    }
  }
}

async function pageOverflows(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
}

async function fulfillVersion(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: status === 200 ? "application/json" : "application/problem+json",
    body: JSON.stringify(body),
  });
}

async function assertShell(page: Page, heading: string, nav: string): Promise<void> {
  await expect(page.getByRole("heading", { name: heading, level: 1 })).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveCount(1);
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toHaveCount(1);
  await page.keyboard.press("Tab");
  if (!(await skip.evaluate((node) => node === document.activeElement))) {
    await skip.focus();
  }
  await expect(skip).toBeFocused();
  await expect(
    page.getByRole("navigation", { name: "Platform" }).getByRole("link", { name: nav })
  ).toHaveAttribute("aria-current", "page");
  expect(await pageOverflows(page)).toBe(false);
  await expect(page.getByRole("button", { name: /Rollback|Redeploy|SSH|Terminal/i })).toHaveCount(0);
  await expect(page.getByText(/Rollback|Redeploy|SSH into|Open terminal/i)).toHaveCount(0);
}

test.describe("Story 44.9 — Deployment version health", () => {
  test("Overview and Operations version states at 1440/390", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(150_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const tenantSession = await loginOperatorSession(request);
    await seedOperatorAuthSession(page, tenantSession);
    await page.goto("/platform/overview", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toHaveCount(0);
    await page.goto("/platform/ops", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Operations", level: 1 })).toHaveCount(0);

    const session = await loginPlatformAdminSession(request);
    await page.route("**/api/v1/platform/ops/version", async (route) => {
      await fulfillVersion(route, versionPayload());
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform/overview");
    await assertShell(page, "Overview", "Overview");
    await expect(page.getByRole("heading", { name: "Version" })).toBeVisible();
    await expect(page.getByText(SHA.slice(0, 12))).toBeVisible();
    await expect(page.getByText(SHA)).toBeVisible();
    await expect(page.getByText("Production")).toBeVisible();
    await expect(page.getByText("v1", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Missing instrumentation")).toHaveCount(0);
    await expect(page.getByText("Tenant status")).toBeVisible();
    const overviewAxe = await analyzeAxe(page);
    const overviewBlocking = overviewAxe.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical"
    );
    expect(overviewBlocking, JSON.stringify(overviewBlocking, null, 2)).toEqual([]);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "overview-actual-1440.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, "/platform/overview");
    await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
    await expect(page.getByText(SHA)).toBeVisible();
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "overview-actual-390.png"),
      fullPage: true,
    });

    await page.unroute("**/api/v1/platform/ops/version");
    await page.route("**/api/v1/platform/ops/version", async (route) => {
      await fulfillVersion(route, missingVersion);
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform/overview");
    await expect(page.getByText("Missing instrumentation").first()).toBeVisible();
    await expect(page.getByText(/not currently instrumented/i)).toBeVisible();
    await expect(page.getByText(SHA)).toHaveCount(0);
    await expect(page.getByText("Tenant status")).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "overview-missing-1440.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, "/platform/overview");
    await expect(page.getByText("Missing instrumentation").first()).toBeVisible();
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "overview-missing-390.png"),
      fullPage: true,
    });

    await page.unroute("**/api/v1/platform/ops/version");
    await page.route("**/api/v1/platform/ops/version", async (route) => {
      await fulfillVersion(
        route,
        {
          title: "Version data unavailable",
          detail: "Could not load version.",
        },
        503
      );
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform/overview");
    await expect(page.getByText("Version data unavailable")).toBeVisible();
    await expect(page.getByText("Missing instrumentation")).toHaveCount(0);
    await expect(page.getByText("Tenant status")).toBeVisible();

    await page.unroute("**/api/v1/platform/ops/version");
    await page.route("**/api/v1/platform/ops/version", async (route) => {
      await fulfillVersion(route, versionPayload());
    });
    await openPlatform(page, session, "/platform/ops");
    await assertShell(page, "Operations", "Operations");
    await expect(page.getByRole("heading", { name: "Health" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Billing / Paddle" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Outbox" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Version" })).toBeVisible();
    await expect(page.getByText(SHA)).toBeVisible();
    const opsAxe = await analyzeAxe(page);
    const opsBlocking = opsAxe.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical"
    );
    expect(opsBlocking, JSON.stringify(opsBlocking, null, 2)).toEqual([]);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "ops-actual-1440.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, "/platform/ops");
    await expect(page.getByRole("heading", { name: "Operations", level: 1 })).toBeVisible();
    await expect(page.getByText(SHA)).toBeVisible();
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "ops-actual-390.png"),
      fullPage: true,
    });

    await page.unroute("**/api/v1/platform/ops/version");
    await page.route("**/api/v1/platform/ops/version", async (route) => {
      await fulfillVersion(route, missingVersion);
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform/ops");
    await expect(page.getByText("Missing instrumentation").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Health" })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "ops-missing-1440.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, "/platform/ops");
    await expect(page.getByText("Missing instrumentation").first()).toBeVisible();
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "ops-missing-390.png"),
      fullPage: true,
    });

    await page.unroute("**/api/v1/platform/ops/version");
    await page.route("**/api/v1/platform/ops/version", async (route) => {
      await fulfillVersion(
        route,
        { title: "Version data unavailable", detail: "Could not load version." },
        503
      );
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform/ops");
    await expect(page.getByText("Version data unavailable")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Health" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Billing / Paddle" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Outbox" })).toBeVisible();
    await expect(page.getByText("Missing instrumentation")).toHaveCount(0);
  });
});
