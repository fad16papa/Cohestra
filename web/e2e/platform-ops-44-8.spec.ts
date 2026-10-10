import { expect, test, type Page } from "@playwright/test";

import { analyzeAxe } from "./helpers/analyze-axe";
import {
  loginOperatorSession,
  loginPlatformAdminSession,
  seedOperatorAuthSession,
  waitForPlatformConsole,
  type OperatorSession,
} from "./helpers/registration-e2e-api";

const ISSUE_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const inbox = {
  items: [
    {
      id: ISSUE_ID,
      issueNumber: "SUP20261010000001",
      tenantSlug: "demo",
      operatorEmail: "ops@example.com",
      subject: "Printer fire",
      status: "Open",
      severity: "Critical",
      createdAt: "2026-10-10T12:00:00Z",
    },
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      issueNumber: "SUP20261010000002",
      tenantSlug: "demo",
      operatorEmail: "ops@example.com",
      subject: "Typo",
      status: "Open",
      severity: "Unspecified",
      createdAt: "2026-10-09T12:00:00Z",
    },
  ],
  page: 1,
  pageSize: 25,
  totalCount: 2,
};

const detail = {
  id: ISSUE_ID,
  issueNumber: "SUP20261010000001",
  tenantId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  tenantSlug: "demo",
  tenantName: "Demo",
  plan: "Core",
  operatorEmail: "ops@example.com",
  operatorDisplayName: "Ops",
  subject: "Printer fire",
  description: "Smoke from the lobby printer.",
  status: "Open",
  severity: "Unspecified",
  userAgent: null,
  internalNote: null,
  createdAt: "2026-10-10T12:00:00Z",
  updatedAt: "2026-10-10T12:00:00Z",
  attachments: [],
  replies: [],
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

test.describe("Story 44.8 — Support severity", () => {
  test("inbox and triage 1440/390 plus 43.4 shell", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);

    const tenantSession = await loginOperatorSession(request);
    await seedOperatorAuthSession(page, tenantSession);
    await page.goto("/platform/support", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Support inbox", level: 1 })).toHaveCount(0);

    const session = await loginPlatformAdminSession(request);
    await page.route("**/api/v1/platform/support-issues?**", async (route) => {
      const url = route.request().url();
      if (url.includes("severity=Critical")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...inbox, items: [inbox.items[0]], totalCount: 1 }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(inbox),
      });
    });
    await page.route(`**/api/v1/platform/support-issues/${ISSUE_ID}`, async (route) => {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON() as { severity?: string };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...detail, severity: body.severity ?? "Critical", status: "Open" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(detail),
      });
    });
    await page.route(`**/api/v1/platform/tenants/${detail.tenantId}/snapshot`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tenantId: detail.tenantId,
          slug: "demo",
          name: "Demo",
          plan: "Core",
          status: "Active",
          billingStatus: "Free",
          isComplimentary: true,
          seats: { used: 1, max: 5 },
          communities: { used: 1, max: 5 },
          publishedActivities: { used: 1, max: 5 },
          registrationsThisMonth: { used: 1, max: 5 },
          lastActivityAt: null,
          openIssueCount: 1,
          isDemoOrLoadTest: false,
          members: [],
        }),
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform/support");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
    await expect(page.getByRole("heading", { name: "Support inbox", level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(
      page.getByRole("navigation", { name: "Platform" }).getByRole("link", { name: "Support" })
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByLabel("Filter by severity")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Critical" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Unspecified" })).toBeVisible();
    await page.getByLabel("Filter by severity").selectOption("Critical");
    await expect(page.getByText("Typo")).toHaveCount(0);
    await expect(page.getByText("Printer fire")).toBeVisible();
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: "../_bmad-output/planning-artifacts/evidence/px2-44-8/viewports/support-inbox-1440.png",
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, "/platform/support");
    await expect(page.getByRole("heading", { name: "Support inbox", level: 1 })).toBeVisible();
    await expect(page.getByLabel("Filter by severity")).toBeVisible();
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: "../_bmad-output/planning-artifacts/evidence/px2-44-8/viewports/support-inbox-390.png",
      fullPage: true,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, `/platform/support/${ISSUE_ID}`);
    await expect(page.getByRole("heading", { name: "SUP20261010000001", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Triage" })).toBeVisible();
    await expect(page.getByLabel("Status")).toBeVisible();
    await expect(page.getByLabel("Severity")).toBeVisible();
    await expect(page.getByLabel("Internal note")).toBeVisible();
    await page.getByLabel("Severity").selectOption("Critical");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByLabel("Severity")).toHaveValue("Critical");
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: "../_bmad-output/planning-artifacts/evidence/px2-44-8/viewports/support-detail-1440.png",
      fullPage: true,
    });
    const axe = await analyzeAxe(page);
    const blocking = axe.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical"
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, `/platform/support/${ISSUE_ID}`);
    await expect(page.getByLabel("Severity")).toBeVisible();
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: "../_bmad-output/planning-artifacts/evidence/px2-44-8/viewports/support-detail-390.png",
      fullPage: true,
    });
  });
});
