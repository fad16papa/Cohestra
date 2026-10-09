import { expect, test, type Page } from "@playwright/test";

import { analyzeAxe } from "./helpers/analyze-axe";
import {
  loginOperatorSession,
  loginPlatformAdminSession,
  seedOperatorAuthSession,
  waitForPlatformConsole,
  type OperatorSession,
} from "./helpers/registration-e2e-api";

async function openPlatform(page: Page, session: OperatorSession, route: string): Promise<void> {
  await seedOperatorAuthSession(page, session);
  await page.goto(route, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.evaluate((stored) => {
      localStorage.setItem("auth_session", JSON.stringify(stored));
    }, session);
    await page.goto(route, { waitUntil: "domcontentloaded" });
  }
  await waitForPlatformConsole(page);
}

async function pageOverflows(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
}

const degradedHealth = {
  overallStatus: "Degraded",
  observedAt: new Date().toISOString(),
  checks: [
    { name: "default-tenant", status: "Healthy", durationMs: 5, description: "present" },
    { name: "postgres", status: "Healthy", durationMs: 11, description: "ok" },
    { name: "redis", status: "Degraded", durationMs: 42, description: "slow" },
  ],
  notInProbe: [
    { name: "hosted-jobs", status: "not_in_probe", durationMs: null, description: "Not measured by this probe." },
    { name: "outbox", status: "not_in_probe", durationMs: null, description: "Not measured by this probe." },
    { name: "paddle", status: "not_in_probe", durationMs: null, description: "Not measured by this probe." },
    { name: "sendgrid", status: "not_in_probe", durationMs: null, description: "Not measured by this probe." },
  ],
};

test.describe("Story 44.3 — Operations health shell", () => {
  test("PlatformAdmin ops 1440/390, banner, overview, denial", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);

    const tenantSession = await loginOperatorSession(request);
    await seedOperatorAuthSession(page, tenantSession);
    await page.goto("/platform/ops", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/platform\/ops$/);
    await expect(page.getByRole("heading", { name: "Operations", level: 1 })).toHaveCount(0);

    const session = await loginPlatformAdminSession(request);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform/ops");
    await expect(page.getByRole("heading", { name: "Operations", level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(
      page.getByRole("navigation", { name: "Platform" }).getByRole("link", { name: "Operations" })
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("navigation", { name: "Platform" }).getByRole("link", { name: "Tenants" })
    ).not.toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Health" })).toBeVisible();
    await expect(page.getByText("postgres")).toBeVisible();
    await expect(page.getByText("redis")).toBeVisible();
    await expect(page.getByText("default-tenant")).toBeVisible();
    await expect(page.getByText("Not in this probe")).toHaveCount(4);
    await expect(page.getByText("Missing instrumentation")).toHaveCount(2);
    await expect(page.getByText(/does not prove/i)).toBeVisible();
    await expect(page.getByText("ms").first()).toBeVisible();
    const axe = await analyzeAxe(page);
    const blocking = axe.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical"
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    expect(await pageOverflows(page)).toBe(false);

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, "/platform/ops");
    await expect(page.getByRole("heading", { name: "Operations", level: 1 })).toBeVisible();
    await expect(page.getByRole("main")).toHaveCount(1);
    expect(await pageOverflows(page)).toBe(false);
    const menu = page.getByRole("button", { name: /open menu|close menu/i });
    const box = await menu.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    await menu.click();
    await expect(
      page.getByRole("navigation", { name: "Platform mobile" }).getByRole("link", { name: "Operations" })
    ).toHaveAttribute("aria-current", "page");

    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform/overview");
    await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toHaveCount(1);
    await expect(
      page.getByRole("navigation", { name: "Platform" }).getByRole("link", { name: "Overview" })
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Actual").first()).toBeVisible();
    await expect(page.getByText(/does not prove/i)).toBeVisible();
    expect(page.url()).not.toContain("/platform/ops");

    await page.route("**/api/v1/platform/ops/overview**", async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...body,
          stackHealth: {
            value: null,
            source: "Authenticated health request failed",
            observedAt: new Date().toISOString(),
            freshness: "unavailable",
          },
        }),
      });
    });
    await openPlatform(page, session, "/platform/overview");
    await expect(page.getByText("Unavailable")).toBeVisible();
    await expect(page.getByText(/could not produce data/i)).toBeVisible();
    await page.unroute("**/api/v1/platform/ops/overview**");

    await page.route("**/api/v1/platform/ops/health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(degradedHealth),
      });
    });
    await openPlatform(page, session, "/platform");
    await expect(page.getByRole("heading", { name: "Tenant directory", level: 1 })).toHaveCount(1);
    await expect(
      page.getByRole("navigation", { name: "Platform" }).getByRole("link", { name: "Tenants" })
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("alert")).toContainText("Infrastructure health is Degraded");
    await expect(page.getByRole("alert")).toContainText("redis is Degraded");
    await expect(page.getByRole("alert")).toContainText("/ready");
    await expect(page.getByRole("alert")).toContainText("outbox");
    await expect(page.getByPlaceholder("Slug or organization name")).toBeVisible();
    expect(await pageOverflows(page)).toBe(false);

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, "/platform");
    await expect(page.getByRole("alert")).toContainText("Degraded");
    expect(await pageOverflows(page)).toBe(false);
    await page.unroute("**/api/v1/platform/ops/health");
  });
});
