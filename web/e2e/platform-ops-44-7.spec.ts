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

const populated = {
  items: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      actorUserId: "22222222-2222-2222-2222-222222222222",
      actorEmail: "ops@example.com",
      tenantId: TENANT_ID,
      action: "TenantSuspended",
      reason: "ToS review",
      createdAt: "2026-10-10T12:00:00Z",
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      actorUserId: "44444444-4444-4444-4444-444444444444",
      actorEmail: null,
      tenantId: TENANT_ID,
      action: "PasswordResetSent",
      reason: null,
      createdAt: "2026-10-09T12:00:00Z",
    },
  ],
  page: 1,
  pageSize: 25,
  totalCount: 2,
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

test.describe("Story 44.7 — Platform-wide searchable audits", () => {
  test("PlatformAdmin audits 1440/390 plus tenant recent-audit regression", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);

    const tenantSession = await loginOperatorSession(request);
    await seedOperatorAuthSession(page, tenantSession);
    await page.goto("/platform/audits", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Audits", level: 1 })).toHaveCount(0);

    const session = await loginPlatformAdminSession(request);
    await page.route("**/api/v1/platform/audits/export**", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/problem+json",
        body: JSON.stringify({ detail: "Export exceeds 5000 rows. Narrow the filters." }),
      });
    });
    await page.route("**/api/v1/platform/audits?**", async (route) => {
      if (route.request().url().includes("/export")) {
        await route.fulfill({
          status: 400,
          contentType: "application/problem+json",
          body: JSON.stringify({ detail: "Export exceeds 5000 rows. Narrow the filters." }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(populated),
      });
    });
    await page.route("**/api/v1/platform/audits", async (route) => {
      if (route.request().url().includes("/export")) {
        await route.fulfill({
          status: 400,
          contentType: "application/problem+json",
          body: JSON.stringify({ detail: "Export exceeds 5000 rows. Narrow the filters." }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(populated),
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform/audits");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    await expect(page.getByRole("heading", { name: "Audits", level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(
      page.getByRole("navigation", { name: "Platform" }).getByRole("link", { name: "Audits" })
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("navigation", { name: "Platform" }).getByRole("link", { name: "Tenants" })
    ).not.toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "TenantSuspended" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "ToS review" })).toBeVisible();
    await expect(page.getByRole("cell", { name: /Unknown actor email/ })).toBeVisible();
    await expect(page.getByText("AUDIT_DETAILS_SECRET_44_7")).toHaveCount(0);
    await expect(page.getByLabel("Action")).toBeVisible();
    await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
    await page.getByRole("button", { name: "Export CSV" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Export exceeds 5000 rows" })).toBeVisible();
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: "../_bmad-output/planning-artifacts/evidence/px2-44-7/viewports/audits-populated-1440.png",
      fullPage: true,
    });
    const axe = await analyzeAxe(page);
    const blocking = axe.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical"
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, "/platform/audits");
    await expect(page.getByRole("heading", { name: "Audits", level: 1 })).toBeVisible();
    await expect(page.locator("ol").getByText("ToS review")).toBeVisible();
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: "../_bmad-output/planning-artifacts/evidence/px2-44-7/viewports/audits-populated-390.png",
      fullPage: true,
    });

    await page.unroute("**/api/v1/platform/audits");
    await page.unroute("**/api/v1/platform/audits?**");
    await page.route("**/api/v1/platform/audits**", async (route) => {
      if (route.request().url().includes("/export")) {
        await route.fulfill({ status: 200, contentType: "text/csv", body: "id\n" });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], page: 1, pageSize: 25, totalCount: 0 }),
      });
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform/audits");
    await expect(page.getByText("No platform audit entries are recorded.")).toBeVisible();
    await expect(page.getByText("No activity occurred")).toHaveCount(0);
    await page.screenshot({
      path: "../_bmad-output/planning-artifacts/evidence/px2-44-7/viewports/audits-empty-1440.png",
      fullPage: true,
    });

    await openPlatform(page, session, "/platform/audits?action=TenantSuspended");
    await expect(page.getByText("No audit entries match these filters.")).toBeVisible();
    await page.screenshot({
      path: "../_bmad-output/planning-artifacts/evidence/px2-44-7/viewports/audits-filtered-empty-1440.png",
      fullPage: true,
    });

    await page.unroute("**/api/v1/platform/audits**");
    await page.route("**/api/v1/platform/audits**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/problem+json",
        body: JSON.stringify({ detail: "down" }),
      });
    });
    await openPlatform(page, session, "/platform/audits");
    await expect(page.getByText(/Audits are unavailable/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();
    await page.screenshot({
      path: "../_bmad-output/planning-artifacts/evidence/px2-44-7/viewports/audits-error-1440.png",
      fullPage: true,
    });

    await page.route(`**/api/v1/platform/tenants/${TENANT_ID}`, async (route) => {
      if (route.request().url().includes("/timeline") || route.request().url().includes("/snapshot")) {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tenant: {
            id: TENANT_ID,
            slug: "audit-demo",
            name: "audit-demo",
            plan: "Core",
            status: "Active",
            billingStatus: "Free",
            isComplimentary: true,
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
        }),
      });
    });
    await page.route(`**/api/v1/platform/tenants/${TENANT_ID}/snapshot`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tenantId: TENANT_ID,
          slug: "audit-demo",
          name: "audit-demo",
          plan: "Core",
          status: "Active",
          billingStatus: "Free",
          isComplimentary: true,
          seats: { used: 1, max: 5 },
          communities: { used: 1, max: 5 },
          publishedActivities: { used: 1, max: 5 },
          registrationsThisMonth: { used: 1, max: 5 },
          lastActivityAt: null,
          openIssueCount: 0,
          isDemoOrLoadTest: false,
          members: [],
        }),
      });
    });
    await page.route(`**/api/v1/platform/tenants/${TENANT_ID}/members`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await page.route(`**/api/v1/platform/tenants/${TENANT_ID}/open-issues`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await page.route(`**/api/v1/platform/tenants/${TENANT_ID}/timeline`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tenantId: TENANT_ID,
          observedAt: "2026-10-10T01:00:00Z",
          hasHistoricalEvents: false,
          items: [],
          sources: [],
        }),
      });
    });
    await openPlatform(page, session, `/platform/tenants/${TENANT_ID}`);
    await expect(page.getByRole("heading", { name: "Recent audit" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Timeline", exact: true, level: 2 })).toBeVisible();
  });
});
