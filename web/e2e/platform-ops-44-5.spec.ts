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

const emptyConfig = {
  isConfigured: true,
  environment: "sandbox",
  allowLive: false,
  apiHost: "https://sandbox-api.paddle.com",
};

const deliveryRows = {
  items: [
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      eventId: "evt_processed",
      eventType: "transaction.completed",
      disposition: "Processed",
      tenantId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      httpStatus: 200,
      detailSanitized: "Processed.",
      observedAt: "2026-10-09T12:00:00Z",
    },
    {
      id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      eventId: "evt_dup",
      eventType: "transaction.completed",
      disposition: "Duplicate",
      tenantId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      httpStatus: 200,
      detailSanitized: "Duplicate event.",
      observedAt: "2026-10-09T12:01:00Z",
    },
    {
      id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      eventId: "evt_ign",
      eventType: "address.updated",
      disposition: "Ignored",
      tenantId: null,
      httpStatus: 200,
      detailSanitized: "Ignored event type.",
      observedAt: "2026-10-09T12:02:00Z",
    },
    {
      id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      eventId: "evt_retry",
      eventType: "transaction.payment_failed",
      disposition: "Retryable",
      tenantId: null,
      httpStatus: 503,
      detailSanitized: "Handler failed.",
      observedAt: "2026-10-09T12:03:00Z",
    },
    {
      id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
      eventId: null,
      eventType: null,
      disposition: "Rejected",
      tenantId: null,
      httpStatus: 400,
      detailSanitized: "Invalid Paddle-Signature.",
      observedAt: "2026-10-09T12:04:00Z",
    },
  ],
  page: 1,
  pageSize: 25,
  totalCount: 5,
};

test.describe("Story 44.5 — Operations billing diagnostics", () => {
  test("PlatformAdmin billing 1440/390 empty, rows, error, no mutation", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);

    const tenantSession = await loginOperatorSession(request);
    await seedOperatorAuthSession(page, tenantSession);
    await page.goto("/platform/ops", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Operations", level: 1 })).toHaveCount(0);

    const session = await loginPlatformAdminSession(request);

    await page.route("**/api/v1/platform/ops/paddle/config", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptyConfig),
      });
    });
    await page.route("**/api/v1/platform/ops/paddle/deliveries**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], page: 1, pageSize: 25, totalCount: 0 }),
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform/ops");
    await expect(page.getByRole("heading", { name: "Operations", level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(
      page.getByRole("navigation", { name: "Platform" }).getByRole("link", { name: "Operations" })
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Billing / Paddle" })).toBeVisible();
    await expect(page.getByText("Missing instrumentation")).toBeVisible();
    await expect(page.getByText(/not Paddle down/i)).toBeVisible();
    await expect(page.getByText("Paddle is configured")).toBeVisible();
    await expect(page.getByText("Sandbox setting")).toBeVisible();
    await expect(page.getByRole("button", { name: "Replay" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mark Paid" })).toHaveCount(0);
    await expect(page.getByText("WebhookSecret")).toHaveCount(0);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: "../_bmad-output/planning-artifacts/evidence/px2-44-5/viewports/ops-paddle-empty-1440.png",
      fullPage: true,
    });
    const axeEmpty = await analyzeAxe(page);
    const blockingEmpty = axeEmpty.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical"
    );
    expect(blockingEmpty, JSON.stringify(blockingEmpty, null, 2)).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, "/platform/ops");
    await expect(page.getByText("Missing instrumentation")).toBeVisible();
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: "../_bmad-output/planning-artifacts/evidence/px2-44-5/viewports/ops-paddle-empty-390.png",
      fullPage: true,
    });

    await page.unroute("**/api/v1/platform/ops/paddle/deliveries**");
    await page.route("**/api/v1/platform/ops/paddle/deliveries**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(deliveryRows),
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform/ops");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("table").getByText("Processed", { exact: true })).toBeVisible();
    await expect(page.getByRole("table").getByText("Duplicate", { exact: true })).toBeVisible();
    await expect(page.getByRole("table").getByText("Ignored", { exact: true })).toBeVisible();
    await expect(page.getByRole("table").getByText("Retryable", { exact: true })).toBeVisible();
    await expect(page.getByRole("table").getByText("Rejected", { exact: true })).toBeVisible();
    await expect(page.getByText("HTTP 400")).toBeVisible();
    await expect(page.getByText("CUSTOMER_BODY")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Replay" })).toHaveCount(0);
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: "../_bmad-output/planning-artifacts/evidence/px2-44-5/viewports/ops-paddle-rows-1440.png",
      fullPage: true,
    });
    const axeRows = await analyzeAxe(page);
    const blockingRows = axeRows.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical"
    );
    expect(blockingRows, JSON.stringify(blockingRows, null, 2)).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, "/platform/ops");
    await expect(page.getByRole("table")).toBeVisible();
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: "../_bmad-output/planning-artifacts/evidence/px2-44-5/viewports/ops-paddle-rows-390.png",
      fullPage: true,
    });

    await page.unroute("**/api/v1/platform/ops/paddle/config");
    await page.unroute("**/api/v1/platform/ops/paddle/deliveries**");
    await page.route("**/api/v1/platform/ops/paddle/config", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/problem+json",
        body: JSON.stringify({ title: "Paddle delivery data unavailable", detail: "down" }),
      });
    });
    await page.route("**/api/v1/platform/ops/paddle/deliveries**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/problem+json",
        body: JSON.stringify({ title: "Paddle delivery data unavailable", detail: "down" }),
      });
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform/ops");
    const alert = page.getByRole("alert").filter({ hasText: "Billing diagnostics unavailable" });
    await expect(alert).toBeVisible();
    await expect(page.getByText("Paddle is configured")).toHaveCount(0);
    await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});
