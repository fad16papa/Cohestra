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

test.describe("Story 44.2 — Production overview", () => {
  test("PlatformAdmin overview 1440/390, directory regression, denial", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(90_000);

    const tenantSession = await loginOperatorSession(request);
    await seedOperatorAuthSession(page, tenantSession);
    await page.goto("/platform/overview", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/platform\/overview/);
    await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toHaveCount(0);

    const session = await loginPlatformAdminSession(request);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform/overview");
    await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(
      page.getByRole("navigation", { name: "Platform" }).getByRole("link", { name: "Overview" })
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("navigation", { name: "Platform" }).getByRole("link", { name: "Tenants" })
    ).not.toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Missing instrumentation")).toBeVisible();
    await expect(page.getByText("Instrumentation not available yet.")).toBeVisible();
    await expect(page.getByText("PostgreSQL tenants")).toHaveCount(2);
    await expect(page.getByText("Loading overview")).toHaveCount(0);
    await expect(page.getByText(/\bHealthy\b/)).toHaveCount(0);
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
    await openPlatform(page, session, "/platform/overview");
    await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
    await expect(page.getByRole("main")).toHaveCount(1);
    expect(await pageOverflows(page)).toBe(false);
    const menu = page.getByRole("button", { name: /open menu|close menu/i });
    const box = await menu.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    await menu.click();
    await expect(
      page.getByRole("navigation", { name: "Platform mobile" }).getByRole("link", { name: "Overview" })
    ).toHaveAttribute("aria-current", "page");

    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform");
    await expect(page.getByRole("heading", { name: "Tenant directory", level: 1 })).toHaveCount(1);
    await expect(
      page.getByRole("navigation", { name: "Platform" }).getByRole("link", { name: "Tenants" })
    ).toHaveAttribute("aria-current", "page");
    expect(page.url()).not.toContain("/platform/overview");

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, "/platform");
    await expect(page.getByRole("heading", { name: "Tenant directory", level: 1 })).toBeVisible();
    expect(await pageOverflows(page)).toBe(false);
    expect(page.url()).not.toContain("/platform/overview");
  });
});
