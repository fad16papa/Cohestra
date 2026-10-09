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

const emptySummary = {
  countsByStatus: {
    value: [
      { key: "Pending", count: 0 },
      { key: "Processing", count: 0 },
      { key: "Completed", count: 0 },
      { key: "Failed", count: 0 },
    ],
    source: "PostgreSQL outbox_messages",
    observedAt: new Date().toISOString(),
    freshness: "actual",
  },
  countsByMessageType: {
    value: [],
    source: "PostgreSQL outbox_messages",
    observedAt: new Date().toISOString(),
    freshness: "actual",
  },
};

const failedList = {
  items: [
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      tenantId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      messageType: "campaign.recipient",
      status: "Failed",
      attemptCount: 5,
      createdAt: "2026-10-09T12:00:00Z",
      nextAttemptAt: "2026-10-09T12:05:00Z",
      processedAt: null,
      claimedAt: null,
      dispatchedAt: null,
      lastErrorSanitized: "[redacted] smtp timeout",
    },
  ],
  page: 1,
  pageSize: 25,
  totalCount: 1,
};

test.describe("Story 44.4 — Operations outbox", () => {
  test("PlatformAdmin outbox 1440/390 empty, failed, error, no mutation", async ({
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

    await page.route("**/api/v1/platform/ops/outbox/summary", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptySummary),
      });
    });
    await page.route("**/api/v1/platform/ops/outbox?**", async (route) => {
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
    await expect(page.getByRole("heading", { name: "Outbox" })).toBeVisible();
    await expect(page.getByText("No failed outbox jobs are recorded.")).toBeVisible();
    await expect(page.getByText(/does not mean email is healthy/i)).toBeVisible();
    await expect(page.getByText("Jobs by status")).toBeVisible();
    await expect(page.getByRole("button", { name: "Requeue" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Replay" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    expect(await pageOverflows(page)).toBe(false);
    const axeEmpty = await analyzeAxe(page);
    const blockingEmpty = axeEmpty.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical"
    );
    expect(blockingEmpty, JSON.stringify(blockingEmpty, null, 2)).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, "/platform/ops");
    await expect(page.getByText("No failed outbox jobs are recorded.")).toBeVisible();
    expect(await pageOverflows(page)).toBe(false);

    await page.unroute("**/api/v1/platform/ops/outbox/summary");
    await page.unroute("**/api/v1/platform/ops/outbox?**");
    await page.route("**/api/v1/platform/ops/outbox/summary", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...emptySummary,
          countsByStatus: {
            ...emptySummary.countsByStatus,
            value: [
              { key: "Pending", count: 0 },
              { key: "Processing", count: 0 },
              { key: "Completed", count: 0 },
              { key: "Failed", count: 1 },
            ],
          },
          countsByMessageType: {
            ...emptySummary.countsByMessageType,
            value: [{ key: "campaign.recipient", count: 1 }],
          },
        }),
      });
    });
    await page.route("**/api/v1/platform/ops/outbox?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(failedList),
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform/ops");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("Failed", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("campaign.recipient")).toBeVisible();
    await expect(page.getByText("[redacted] smtp timeout")).toBeVisible();
    await expect(page.getByText("CUSTOMER_BODY")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Requeue" })).toHaveCount(0);
    expect(await pageOverflows(page)).toBe(false);
    const axeFailed = await analyzeAxe(page);
    const blockingFailed = axeFailed.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical"
    );
    expect(blockingFailed, JSON.stringify(blockingFailed, null, 2)).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, "/platform/ops");
    await expect(page.getByRole("table")).toBeVisible();
    expect(await pageOverflows(page)).toBe(false);

    await page.unroute("**/api/v1/platform/ops/outbox/summary");
    await page.unroute("**/api/v1/platform/ops/outbox?**");
    await page.route("**/api/v1/platform/ops/outbox/summary", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/problem+json",
        body: JSON.stringify({ title: "Outbox data unavailable", detail: "down" }),
      });
    });
    await page.route("**/api/v1/platform/ops/outbox?**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/problem+json",
        body: JSON.stringify({ title: "Outbox data unavailable", detail: "down" }),
      });
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform/ops");
    const outboxAlert = page.getByRole("alert").filter({ hasText: "Outbox data unavailable" });
    await expect(outboxAlert).toBeVisible();
    await expect(page.getByText("Jobs by status")).toHaveCount(0);
    await expect(outboxAlert.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});
