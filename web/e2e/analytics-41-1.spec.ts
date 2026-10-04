import fs from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  DEFAULT_PRO_TENANT,
  PX2_BASIC_TENANT,
  PX2_CORE_TENANT,
  PX2_PRO_MEMBER,
  loginOwnedTenant,
  type OwnedTenant,
} from "./helpers/e2e-owned-fixtures";
import { resolveE2eApiBase, tenantApiHost, tenantWebOrigin } from "./helpers/owned-fixture-data";
import {
  loginOperatorSession,
  seedOperatorAuthSession,
  tenantWebBase,
  waitForOperatorWorkspace,
  waitForReportsContent,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-41-1"
);

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "767x900", width: 767, height: 900 },
  { name: "430x932", width: 430, height: 932 },
  { name: "390x844", width: 390, height: 844 },
] as const;

type AxeViolation = {
  id: string;
  impact: string | null;
  description: string;
};

function emptyReportPayload() {
  return {
    period: {
      preset: "custom",
      startAt: "2099-01-01T00:00:00Z",
      endAt: "2099-01-02T23:59:59Z",
      computedAt: "2099-01-02T12:00:00Z",
    },
    activitiesHosted: 0,
    registrations: 0,
    newLeads: 0,
    followUpStatus: {
      newCount: 0,
      contactedCount: 0,
      activeCount: 0,
      inactiveCount: 0,
      coveragePercent: 0,
    },
    activityRanking: [],
    leadGrowth: {
      newLeadsInPeriod: 0,
      totalLeadsAtEnd: 0,
      totalLeadsBeforePeriod: 0,
    },
    communityRanking: [],
    repeatParticipants: 0,
    inactiveClients: 0,
    campaignResults: { available: false, campaignsSent: 0, campaignsFailed: 0 },
    priorPeriod: {
      startAt: "2098-12-01T00:00:00Z",
      endAt: "2098-12-31T23:59:59Z",
      registrations: 0,
      newLeads: 0,
      activitiesHosted: 0,
      followUpCoveragePercent: 0,
    },
    dailyTrend: [],
  };
}

async function openAuthed(
  page: Page,
  session: Awaited<ReturnType<typeof loginOperatorSession>>,
  route: string,
  origin = tenantWebBase()
): Promise<void> {
  await seedOperatorAuthSession(page, session);
  await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.evaluate((stored) => {
      localStorage.setItem("auth_session", JSON.stringify(stored));
    }, session);
    await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded" });
  }
  await waitForOperatorWorkspace(page);
}

async function assertNoOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  expect(overflow, label).toBe(false);
}

async function assertAxe(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .exclude("[disabled]")
    .exclude('[aria-disabled="true"]')
    .analyze();
  const blocking = (results.violations as AxeViolation[]).filter(
    (violation) =>
      (violation.impact === "serious" || violation.impact === "critical") &&
      [
        "color-contrast",
        "landmark-one-main",
        "page-has-heading-one",
        "bypass",
        "region",
        "td-headers-attr",
        "th-has-data-cells",
        "td-has-header",
        "scope-attr-valid",
        "table-duplicate-name",
        "table-fake-caption",
      ].includes(violation.id)
  );
  expect(blocking, `${label}: ${JSON.stringify(blocking, null, 2)}`).toEqual([]);
}

async function loginOrFail(
  request: Parameters<typeof loginOwnedTenant>[0],
  tenant: OwnedTenant
): Promise<Awaited<ReturnType<typeof loginOwnedTenant>>> {
  return loginOwnedTenant(request, tenant);
}

test.describe("Story 41.1 — Analytics room", () => {
  test("landmarks, /reports redirect, URL history, and Graphs cross-link", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/analytics");
    await waitForReportsContent(page);
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Analytics", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: /upgrade|unlock/i })).toHaveCount(0);

    await page.goto(`${tenantWebBase()}/reports?preset=weekly`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await expect(page).toHaveURL(/\/analytics\?.*preset=weekly/);
    await waitForReportsContent(page);

    const redirectQuery =
      "preset=custom&from=2026-01-01&to=2026-01-31&community=Harbour&leadStatus=new&referralSource=walk-in";
    await page.goto(`${tenantWebBase()}/reports?${redirectQuery}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    expect(new URL(page.url()).pathname).toBe("/analytics");
    const landed = new URL(page.url()).searchParams;
    expect(landed.get("preset")).toBe("custom");
    expect(landed.get("from")).toBe("2026-01-01");
    expect(landed.get("to")).toBe("2026-01-31");
    expect(landed.get("community")).toBe("Harbour");
    expect(landed.get("leadStatus")).toBe("new");
    expect(landed.get("referralSource")).toBe("walk-in");

    await page.goto(`${tenantWebBase()}/analytics?preset=not-a-preset`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await waitForReportsContent(page);
    await expect(page.locator("#report-preset")).toHaveValue("weekly");

    await openAuthed(page, session, "/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    const transition = page.locator("[data-admin-route-transition]");
    await page.getByRole("tab", { name: "Graphs" }).click();
    await expect(page).toHaveURL(/view=graphs/);
    await expect(page.getByRole("link", { name: "Open Analytics" })).toBeVisible();
    await page.getByRole("link", { name: "Open Analytics" }).click();
    await waitForOperatorWorkspace(page);
    await expect(page).toHaveURL(/\/analytics/);
    await waitForReportsContent(page);
    await page.goBack();
    await waitForOperatorWorkspace(page);
    await expect(page).toHaveURL(/\/dashboard\?.*view=graphs/);
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Graphs" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await openAuthed(page, session, "/analytics?preset=weekly");
    await waitForReportsContent(page);
    await transition.evaluate((node) => {
      node.setAttribute("data-41-1-transition", "stable");
    });
    await page.locator("#report-preset").selectOption("monthly");
    await expect(page).toHaveURL(/preset=monthly/);
    await waitForReportsContent(page);
    await expect(transition).toHaveAttribute("data-41-1-transition", "stable");
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await waitForReportsContent(page);
    await expect(page).toHaveURL(/preset=monthly/);
    await expect(page.locator("#report-preset")).toHaveValue("monthly");
    await page.goBack();
    await waitForReportsContent(page);
    await expect(page).toHaveURL(/preset=weekly/);
    await expect(page.locator("#report-preset")).toHaveValue("weekly");
    await page.goForward();
    await waitForReportsContent(page);
    await expect(page).toHaveURL(/preset=monthly/);
  });

  test("Basic weekly stays open, Basic monthly locks, Core monthly stays usable", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const basic = await loginOrFail(request, PX2_BASIC_TENANT);
    const basicOrigin = tenantWebOrigin(PX2_BASIC_TENANT.slug);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, basic, "/analytics?preset=weekly", basicOrigin);
    await waitForReportsContent(page);
    await expect(page.getByRole("heading", { name: "Analytics", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: /queryable reports unlock on core/i })).toHaveCount(
      0
    );
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "analytics-basic-weekly-1440.png"),
      fullPage: true,
    });

    await page.goto(`${basicOrigin}/analytics?preset=monthly`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: "Analytics", level: 1 })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /queryable reports unlock on core/i })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Back to weekly Analytics" })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "analytics-basic-monthly-lock-1440.png"),
      fullPage: true,
    });

    const core = await loginOrFail(request, PX2_CORE_TENANT);
    await openAuthed(
      page,
      core,
      "/analytics?preset=monthly",
      tenantWebOrigin(PX2_CORE_TENANT.slug)
    );
    await waitForReportsContent(page);
    await expect(page.getByRole("heading", { name: /queryable reports unlock on core/i })).toHaveCount(
      0
    );

    const member = await loginOrFail(request, PX2_PRO_MEMBER);
    await openAuthed(page, member, "/analytics?preset=weekly", tenantWebBase());
    await waitForReportsContent(page);
    await expect(page.getByRole("heading", { name: "Analytics", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: /queryable reports unlock on core/i })).toHaveCount(
      0
    );
  });

  test("loading, empty period, stale, error, denied, and disabled export stay truthful", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);

    await page.route("**/api/v1/admin/reports?**", async (route) => {
      if (route.request().url().includes("/export")) {
        await route.continue();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedOperatorAuthSession(page, session);
    const loadingNav = page.goto(`${tenantWebBase()}/analytics?preset=weekly`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { name: "Analytics", level: 1 })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Loading report…")).toBeVisible();
    await loadingNav;
    await page.unroute("**/api/v1/admin/reports?**");
    await waitForReportsContent(page);

    await page.route("**/api/v1/admin/reports?**", async (route) => {
      if (route.request().url().includes("/export")) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptyReportPayload()),
      });
    });
    await page.goto(`${tenantWebBase()}/analytics?preset=custom&from=2099-01-01&to=2099-01-02`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await waitForReportsContent(page);
    await expect(page.getByText("No registrations in this period.")).toBeVisible();
    await expect(page.getByText(/exported|success/i)).toHaveCount(0);
    const exportButton = page.getByRole("button", { name: /Export CSV|Exporting/ });
    await expect(exportButton).toBeDisabled();
    await expect(
      page.getByText("Export is unavailable because this period has no registrations.")
    ).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "analytics-empty-export-disabled-1440.png"),
      fullPage: true,
    });
    await page.unroute("**/api/v1/admin/reports?**");

    let releaseStale: (() => void) | null = null;
    const staleGate = new Promise<void>((resolve) => {
      releaseStale = resolve;
    });
    await page.route("**/api/v1/admin/reports?**", async (route) => {
      if (route.request().url().includes("/export")) {
        await route.continue();
        return;
      }
      if (route.request().url().includes("preset=monthly")) {
        await staleGate;
      }
      await route.continue();
    });
    await page.goto(`${tenantWebBase()}/analytics?preset=weekly`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await waitForReportsContent(page);
    await page.locator("#report-preset").selectOption("monthly");
    await expect(page.getByText("Updating report…")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Analytics", level: 1 })).toBeVisible();
    releaseStale?.();
    await waitForReportsContent(page);
    await page.unroute("**/api/v1/admin/reports?**");

    await page.route("**/api/v1/admin/reports?**", async (route) => {
      if (route.request().url().includes("/export")) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Analytics source unavailable." }),
      });
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: "Analytics", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Could not load Analytics" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Analytics source unavailable.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /upgrade|unlock/i })).toHaveCount(0);
    await expect(
      page.getByText("Export is unavailable while the report cannot load.")
    ).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "analytics-error-1440.png"),
      fullPage: true,
    });
    await page.unroute("**/api/v1/admin/reports?**");
    await page.getByRole("button", { name: "Try again" }).click();
    await waitForReportsContent(page);
    await expect(page.getByRole("heading", { name: "Could not load Analytics" })).toHaveCount(0);

    await page.route("**/api/v1/admin/reports?**", async (route) => {
      if (route.request().url().includes("/export")) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Forbidden." }),
        });
        return;
      }
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Your role cannot open Analytics." }),
      });
    });
    await page.goto(`${tenantWebBase()}/analytics?preset=weekly`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: "Analytics", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "You don’t have access to Analytics" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("heading", { name: /upgrade|unlock/i })).toHaveCount(0);
    await page.unroute("**/api/v1/admin/reports?**");
  });

  test("export uses the active filters and tenants stay isolated", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    const session = await loginOperatorSession(request);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/analytics?preset=weekly");
    await waitForReportsContent(page);

    const exportButton = page.getByRole("button", { name: "Export CSV" });
    if (await exportButton.isEnabled()) {
      const seenExportUrls: string[] = [];
      await page.route("**/api/v1/admin/reports/export**", async (route) => {
        seenExportUrls.push(route.request().url());
        await route.continue();
      });
      const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
      await exportButton.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.csv$/i);
      expect(seenExportUrls.some((url) => url.includes("preset=weekly"))).toBe(true);
      await page.unroute("**/api/v1/admin/reports/export**");
    } else {
      await expect(page.getByText(/Export is unavailable because this period has no registrations/)).toBeVisible();
    }

    async function reportIds(tenant: OwnedTenant): Promise<string[]> {
      const tenantSession = await loginOwnedTenant(request, tenant);
      const response = await request.get(
        `${resolveE2eApiBase()}/api/v1/admin/reports?preset=weekly`,
        {
          headers: {
            Authorization: `Bearer ${tenantSession.accessToken}`,
            Host: tenantApiHost(tenant.slug),
          },
        }
      );
      expect(response.ok(), `${tenant.slug} reports ${response.status()}`).toBeTruthy();
      const body = (await response.json()) as {
        activityRanking?: Array<{ activityId?: string }>;
      };
      return (body.activityRanking ?? [])
        .map((item) => item.activityId)
        .filter((id): id is string => typeof id === "string");
    }

    async function exportText(tenant: OwnedTenant): Promise<string> {
      const tenantSession = await loginOwnedTenant(request, tenant);
      const response = await request.get(
        `${resolveE2eApiBase()}/api/v1/admin/reports/export?preset=weekly`,
        {
          headers: {
            Authorization: `Bearer ${tenantSession.accessToken}`,
            Host: tenantApiHost(tenant.slug),
          },
        }
      );
      if (response.status() === 400 || response.status() === 404) {
        return "";
      }
      expect(response.ok(), `${tenant.slug} export ${response.status()}`).toBeTruthy();
      return response.text();
    }

    const defaultIds = await reportIds(DEFAULT_PRO_TENANT);
    const basicIds = await reportIds(PX2_BASIC_TENANT);
    expect(
      defaultIds.filter((id) => basicIds.includes(id)),
      "activity ranking ids must not leak across tenants"
    ).toEqual([]);

    const defaultCsv = await exportText(DEFAULT_PRO_TENANT);
    const basicCsv = await exportText(PX2_BASIC_TENANT);
    for (const id of defaultIds) {
      expect(basicCsv.includes(id), `Basic CSV must not contain Pro activity ${id}`).toBe(false);
    }
    for (const id of basicIds) {
      expect(defaultCsv.includes(id), `Pro CSV must not contain Basic activity ${id}`).toBe(false);
    }
  });

  test("viewports, chart summary, axe, dark, forced colors, and reduced motion", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(240_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openAuthed(page, session, "/analytics?preset=weekly");
      await waitForReportsContent(page);
      await expect(page.getByRole("heading", { name: "Analytics", level: 1 })).toBeVisible();
      await assertNoOverflow(page, `${viewport.name} overflow`);

      const preset = page.locator("#report-preset");
      const presetBox = await preset.boundingBox();
      expect(presetBox, `${viewport.name} preset`).toBeTruthy();
      expect(presetBox!.height, `${viewport.name} preset height`).toBeGreaterThanOrEqual(44);

      const exportButton = page.getByRole("button", { name: /Export CSV|Exporting/ });
      await expect(exportButton).toBeVisible();
      const exportBox = await exportButton.boundingBox();
      expect(exportBox, `${viewport.name} export`).toBeTruthy();
      expect(exportBox!.height, `${viewport.name} export height`).toBeGreaterThanOrEqual(44);
      expect(exportBox!.width, `${viewport.name} export width`).toBeGreaterThanOrEqual(44);

      if (viewport.width < 768) {
        const activity = page.getByRole("heading", { name: "Top activities" });
        const community = page.getByRole("heading", { name: "Community ranking" });
        if ((await activity.count()) > 0 && (await community.count()) > 0) {
          const activityBox = await activity.boundingBox();
          const communityBox = await community.boundingBox();
          if (activityBox && communityBox) {
            expect(
              communityBox.y - (activityBox.y + activityBox.height),
              `${viewport.name} charts must stack`
            ).toBeGreaterThan(-8);
          }
        }
      }

      await page.screenshot({
        path: path.join(evidenceDir, "viewports", `analytics-${viewport.name}.png`),
        fullPage: true,
      });
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/analytics?preset=weekly");
    await waitForReportsContent(page);
    const trendTable = page.locator("table", {
      has: page.locator("caption", { hasText: /Daily registrations and new clients/i }),
    });
    if ((await page.getByRole("heading", { name: "Registrations over time" }).count()) > 0) {
      if ((await trendTable.count()) > 0) {
        await expect(trendTable.locator("th", { hasText: "Date" })).toHaveCount(1);
        await expect(trendTable.locator("th", { hasText: "Registrations" })).toHaveCount(1);
        await expect(trendTable.locator("th", { hasText: "New clients" })).toHaveCount(1);
      }
    }
    await expect(page.getByRole("heading", { name: "Top activities" }).or(page.getByText("No registrations in this period."))).toBeVisible();
    await assertAxe(page, "analytics populated");

    await page.getByRole("button", { name: /appearance:/i }).click();
    await page.getByRole("radio", { name: /^dark$/i }).click();
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 15_000 });
    await waitForReportsContent(page);
    await assertAxe(page, "analytics dark");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "analytics-dark-1440.png"),
      fullPage: true,
    });

    await page.emulateMedia({ forcedColors: "active" });
    await expect(page.getByRole("heading", { name: "Analytics", level: 1 })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "analytics-forced-colors-1440.png"),
      fullPage: true,
    });
    await page.emulateMedia({ forcedColors: "none" });

    await page.emulateMedia({ reducedMotion: "reduce" });
    const transition = page.locator("[data-admin-route-transition]");
    await transition.evaluate((node) => {
      node.setAttribute("data-41-1-reduced", "stable");
    });
    await page.locator("#report-preset").selectOption("weekly");
    await expect(transition).toHaveAttribute("data-41-1-reduced", "stable");
    await page.emulateMedia({ reducedMotion: "no-preference" });
  });
});
