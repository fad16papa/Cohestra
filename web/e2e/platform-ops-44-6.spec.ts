import { expect, test, type Page } from "@playwright/test";

import { analyzeAxe } from "./helpers/analyze-axe";
import {
  loginOperatorSession,
  loginPlatformAdminSession,
  seedOperatorAuthSession,
  waitForPlatformConsole,
  type OperatorSession,
} from "./helpers/registration-e2e-api";

const TENANT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ROUTE = `/platform/tenants/${TENANT_ID}`;

const tenantDetail = {
  tenant: {
    id: TENANT_ID,
    slug: "timeline-demo",
    name: "Timeline Demo",
    plan: "Core",
    status: "Active",
    billingStatus: "Free",
    isComplimentary: true,
    adminContactEmail: "admin@timeline.test",
    suspendedAt: null,
    archivedAt: null,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  recentAudits: [
    {
      id: "audit-recent",
      actorUserId: "11111111-1111-1111-1111-111111111111",
      actorEmail: "operator@cohestra.local",
      tenantId: TENANT_ID,
      action: "TenantCreated",
      reason: "Provisioned",
      createdAt: "2026-09-01T00:00:00Z",
    },
  ],
};

const meter = { used: 1, max: 5 };
const snapshot = {
  tenantId: TENANT_ID,
  slug: "timeline-demo",
  name: "Timeline Demo",
  plan: "Core",
  status: "Active",
  billingStatus: "Free",
  isComplimentary: true,
  seats: meter,
  communities: meter,
  publishedActivities: meter,
  registrationsThisMonth: meter,
  lastActivityAt: null,
  openIssueCount: 0,
  isDemoOrLoadTest: false,
  members: [{ email: "member@timeline.test", role: "TenantAdmin" }],
};

const members = [
  {
    userId: "cccccccccccccccc-cccc-cccc-cccc-cccccccccccc",
    email: "member@timeline.test",
    role: "TenantAdmin",
    emailVerified: false,
  },
];

const populatedTimeline = {
  tenantId: TENANT_ID,
  observedAt: "2026-10-10T01:00:00Z",
  hasHistoricalEvents: true,
  items: [
    {
      id: `billing-snapshot:${TENANT_ID}`,
      type: "billing_snapshot",
      timestamp: "2026-10-10T01:00:00Z",
      provenance: "tenants/current billing snapshot",
      summary: "Current billing snapshot: Core / Active / Free · Sponsored",
      metadata: { kind: "current_snapshot" },
    },
    {
      id: "audit:1",
      type: "audit",
      timestamp: "2026-10-09T12:00:00Z",
      provenance: "platform_audit_logs",
      summary: "Platform audit TenantSuspended",
      metadata: { action: "TenantSuspended" },
    },
    {
      id: "support:1",
      type: "support",
      timestamp: "2026-10-09T11:00:00Z",
      provenance: "support_issues",
      summary: "Support issue SUP-123 opened",
      metadata: { issueNumber: "SUP-123", milestone: "opened" },
    },
    {
      id: "outbox:1",
      type: "outbox",
      timestamp: "2026-10-09T10:00:00Z",
      provenance: "outbox_messages",
      summary: "Outbox campaign.recipient is Failed",
      metadata: { status: "Failed" },
    },
    {
      id: "paddle:1",
      type: "paddle",
      timestamp: "2026-10-09T09:00:00Z",
      provenance: "paddle_webhook_deliveries",
      summary: "Paddle transaction.completed Processed",
      metadata: { disposition: "Processed" },
    },
  ],
  sources: [
    { source: "platform_audit_logs", state: "present", itemCount: 1 },
    { source: "support_issues", state: "present", itemCount: 1 },
    { source: "outbox_messages", state: "present", itemCount: 1 },
    { source: "paddle_webhook_deliveries", state: "present", itemCount: 1 },
    { source: "tenants/current billing snapshot", state: "present", itemCount: 1 },
  ],
};

const emptyTimeline = {
  tenantId: TENANT_ID,
  observedAt: "2026-10-10T01:00:00Z",
  hasHistoricalEvents: false,
  items: [populatedTimeline.items[0]],
  sources: [
    { source: "platform_audit_logs", state: "empty", itemCount: 0 },
    { source: "support_issues", state: "empty", itemCount: 0 },
    { source: "outbox_messages", state: "empty", itemCount: 0 },
    { source: "paddle_webhook_deliveries", state: "missing_instrumentation", itemCount: 0 },
    { source: "tenants/current billing snapshot", state: "present", itemCount: 1 },
  ],
};

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

async function mockTenantShell(page: Page): Promise<void> {
  await page.route(`**/api/v1/platform/tenants/${TENANT_ID}`, async (route) => {
    if (route.request().url().includes("/timeline") || route.request().url().includes("/snapshot")) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(tenantDetail),
    });
  });
  await page.route(`**/api/v1/platform/tenants/${TENANT_ID}/snapshot`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(snapshot),
    });
  });
  await page.route(`**/api/v1/platform/tenants/${TENANT_ID}/members`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(members),
    });
  });
  await page.route(`**/api/v1/platform/tenants/${TENANT_ID}/open-issues`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}

test.describe("Story 44.6 — Tenant diagnostic timeline", () => {
  test("PlatformAdmin timeline 1440/390 populated, empty, error", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);

    const tenantSession = await loginOperatorSession(request);
    await seedOperatorAuthSession(page, tenantSession);
    await page.goto(ROUTE, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "timeline-demo", level: 1 })).toHaveCount(0);

    const session = await loginPlatformAdminSession(request);
    await mockTenantShell(page);
    await page.route(`**/api/v1/platform/tenants/${TENANT_ID}/timeline`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(populatedTimeline),
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, ROUTE);
    await expect(page.getByRole("heading", { name: "timeline-demo", level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Timeline", exact: true, level: 2 })).toBeVisible();
    await expect(page.getByText("Platform audit TenantSuspended")).toBeVisible();
    await expect(page.getByText("Support issue SUP-123 opened")).toBeVisible();
    await expect(page.getByText("Outbox campaign.recipient is Failed")).toBeVisible();
    await expect(page.getByText("Paddle transaction.completed Processed")).toBeVisible();
    await expect(page.getByText("Source: platform_audit_logs")).toBeVisible();
    await expect(page.getByText("Current billing snapshot: Core / Active / Free")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lifecycle" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent audit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send password reset" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Replay" })).toHaveCount(0);
    await expect(page.getByText("AUDIT_DETAILS_SECRET_44_6")).toHaveCount(0);
    await expect(page.getByText("OUTBOX_PAYLOAD_SECRET_44_6")).toHaveCount(0);
    await expect(page.getByText("SUPPORT_BODY_SECRET_44_6")).toHaveCount(0);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: "../_bmad-output/planning-artifacts/evidence/px2-44-6/viewports/timeline-populated-1440.png",
      fullPage: true,
    });
    const axePopulated = await analyzeAxe(page);
    const blockingPopulated = axePopulated.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical"
    );
    expect(blockingPopulated, JSON.stringify(blockingPopulated, null, 2)).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, ROUTE);
    await expect(page.getByRole("heading", { name: "Timeline", exact: true, level: 2 })).toBeVisible();
    await expect(page.getByText("Support issue SUP-123 opened")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send password reset" })).toBeVisible();
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: "../_bmad-output/planning-artifacts/evidence/px2-44-6/viewports/timeline-populated-390.png",
      fullPage: true,
    });

    await page.unroute(`**/api/v1/platform/tenants/${TENANT_ID}/timeline`);
    await page.route(`**/api/v1/platform/tenants/${TENANT_ID}/timeline`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptyTimeline),
      });
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, ROUTE);
    await expect(
      page.getByText("No diagnostic timeline events are recorded for this tenant yet.")
    ).toBeVisible();
    await expect(page.getByText("missing instrumentation")).toBeVisible();
    await expect(page.getByText("Everything is healthy")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Lifecycle" })).toBeVisible();
    await page.screenshot({
      path: "../_bmad-output/planning-artifacts/evidence/px2-44-6/viewports/timeline-empty-1440.png",
      fullPage: true,
    });

    await page.unroute(`**/api/v1/platform/tenants/${TENANT_ID}/timeline`);
    await page.route(`**/api/v1/platform/tenants/${TENANT_ID}/timeline`, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/problem+json",
        body: JSON.stringify({
          title: "Timeline data unavailable",
          detail: "The diagnostic timeline could not be loaded.",
        }),
      });
    });
    await openPlatform(page, session, ROUTE);
    await expect(page.getByRole("alert").filter({ hasText: "Diagnostic timeline unavailable" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lifecycle" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send password reset" })).toBeVisible();
    await expect(page.getByText("No diagnostic timeline events are recorded for this tenant yet.")).toHaveCount(0);
    await page.screenshot({
      path: "../_bmad-output/planning-artifacts/evidence/px2-44-6/viewports/timeline-error-1440.png",
      fullPage: true,
    });
  });
});
