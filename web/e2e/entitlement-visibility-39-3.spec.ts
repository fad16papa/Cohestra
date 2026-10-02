import fs from "node:fs";
import path from "node:path";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import {
  DEFAULT_PRO_TENANT,
  PX2_BASIC_MEMBER,
  PX2_BASIC_TENANT,
  PX2_CORE_TENANT,
  PX2_PRO_MEMBER,
  loginOwnedTenant,
  type OwnedTenant,
} from "./helpers/e2e-owned-fixtures";
import { resolveE2eApiBase, tenantApiHost, tenantWebOrigin } from "./helpers/owned-fixture-data";
import {
  seedOperatorAuthSession,
  waitForOperatorWorkspace,
  waitForReportsContent,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-39-3"
);
const API_BASE = resolveE2eApiBase();

async function openAuthed(
  page: Page,
  tenant: OwnedTenant,
  session: Awaited<ReturnType<typeof loginOwnedTenant>>,
  route: string
): Promise<string> {
  const base = tenantWebOrigin(tenant.slug);
  await seedOperatorAuthSession(page, session);
  await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.evaluate((stored) => {
      localStorage.setItem("auth_session", JSON.stringify(stored));
    }, session);
    await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
  }
  await waitForOperatorWorkspace(page);
  return base;
}

async function loginOrSkip(
  request: APIRequestContext,
  tenant: OwnedTenant
): Promise<Awaited<ReturnType<typeof loginOwnedTenant>>> {
  try {
    return await loginOwnedTenant(request, tenant);
  } catch (error) {
    test.skip(true, `${tenant.email} @ ${tenant.slug} unavailable: ${String(error)}`);
    throw error;
  }
}

function rail(page: Page) {
  return page.getByRole("navigation", { name: "Admin navigation" });
}

function moreDest(page: Page) {
  return page.getByRole("navigation", { name: "More destinations" });
}

async function openMoreSheet(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  const more = page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: /More/ });
  await more.click();
  await expect(page.getByRole("dialog", { name: "Cohestra" })).toBeVisible();
}

test.describe("Story 39.3 — entitlement visibility", () => {
  test("Basic admin locks Website/Campaigns/Team, keeps Analytics, hides custom domain", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    const session = await loginOrSkip(request, PX2_BASIC_TENANT);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, PX2_BASIC_TENANT, session, "/dashboard");

    const desktop = rail(page);
    await expect(
      desktop.getByRole("link", { name: "Website, locked, requires Core plan" })
    ).toBeVisible();
    await expect(
      desktop.getByRole("link", { name: "Campaigns, locked, requires Pro plan" })
    ).toBeVisible();
    await expect(desktop.getByRole("link", { name: "Analytics", exact: true })).toBeVisible();
    await expect(
      desktop.getByRole("link", { name: /Analytics, locked/ })
    ).toHaveCount(0);

    const sidebar = page.getByRole("complementary", { name: "Workspace" });
    await expect(
      sidebar.getByRole("link", { name: "Team, locked, requires Core plan" })
    ).toBeVisible();

    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "basic-admin-1440.png"),
      fullPage: false,
    });

    await page.setViewportSize({ width: 768, height: 1024 });
    const compactWebsite = desktop.getByRole("link", {
      name: "Website, locked, requires Core plan",
    });
    await expect(compactWebsite).toBeVisible();
    await expect(compactWebsite).toHaveAttribute("title", "Website, locked, requires Core plan");
    await compactWebsite.focus();
    await expect(compactWebsite).toBeFocused();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "basic-admin-768.png"),
      fullPage: false,
    });

    await openMoreSheet(page);
    const sheetNav = moreDest(page);
    await expect(
      sheetNav.getByRole("link", { name: "Website, locked, requires Core plan" })
    ).toBeVisible();
    await expect(
      sheetNav.getByRole("link", { name: "Campaigns, locked, requires Pro plan" })
    ).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Cohestra" }).getByRole("link", {
        name: "Team, locked, requires Core plan",
      })
    ).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "basic-admin-390-more.png"),
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Cohestra" })).toHaveCount(0);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ forcedColors: "active" });
    await expect(
      rail(page).getByRole("link", { name: "Website, locked, requires Core plan" })
    ).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "basic-admin-1440-forced-colors.png"),
      fullPage: false,
    });
    await page.emulateMedia({ forcedColors: "none" });

    await page.goto(`${tenantWebOrigin(PX2_BASIC_TENANT.slug)}/analytics`, {
      waitUntil: "domcontentloaded",
    });
    await waitForReportsContent(page);
    await expect(page.getByRole("heading", { name: "Analytics", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: /upgrade|unlock/i })).toHaveCount(0);

    await page.goto(`${tenantWebOrigin(PX2_BASIC_TENANT.slug)}/analytics?preset=monthly`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: /queryable reports unlock on core/i })).toBeVisible();
    await page.getByRole("button", { name: "Back to weekly Analytics" }).click();
    await waitForReportsContent(page);
    await expect(page.getByRole("heading", { name: /queryable reports unlock on core/i })).toHaveCount(0);

    await page.goto(`${tenantWebOrigin(PX2_BASIC_TENANT.slug)}/dashboard/website`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: /unlock a branded public homepage/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /start core trial/i })).toBeVisible();

    await page.goto(`${tenantWebOrigin(PX2_BASIC_TENANT.slug)}/campaigns`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: /email campaigns are a pro craft/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /start pro trial/i })).toBeVisible();

    await page.goto(`${tenantWebOrigin(PX2_BASIC_TENANT.slug)}/settings/profile`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("button", { name: "Custom domain" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Custom domain" })).toHaveCount(0);
  });

  test("Core admin unlocks Website and still locks Campaigns", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(90_000);
    const session = await loginOrSkip(request, PX2_CORE_TENANT);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, PX2_CORE_TENANT, session, "/dashboard");

    const desktop = rail(page);
    await expect(desktop.getByRole("link", { name: "Website", exact: true })).toBeVisible();
    await expect(desktop.getByRole("link", { name: /Website, locked/ })).toHaveCount(0);
    await expect(
      desktop.getByRole("link", { name: "Campaigns, locked, requires Pro plan" })
    ).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Workspace" }).getByRole("link", {
        name: "Team",
        exact: true,
      })
    ).toBeVisible();

    await page.goto(`${tenantWebOrigin(PX2_CORE_TENANT.slug)}/dashboard/website`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await expect(page.locator("#website-builder-toolbar")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /upgrade/i })).toHaveCount(0);
  });

  test("Pro admin nav is unlocked and Member hides Team without an upgrade offer", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const proSession = await loginOrSkip(request, DEFAULT_PRO_TENANT);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, DEFAULT_PRO_TENANT, proSession, "/dashboard");
    const desktop = rail(page);
    await expect(desktop.getByRole("link", { name: "Website", exact: true })).toBeVisible();
    await expect(desktop.getByRole("link", { name: "Campaigns", exact: true })).toBeVisible();
    await expect(desktop.getByRole("link", { name: /locked/ })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "pro-admin-1440.png"),
      fullPage: false,
    });

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "pro-admin-768.png"),
      fullPage: false,
    });

    const memberSession = await loginOrSkip(request, PX2_PRO_MEMBER);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, PX2_PRO_MEMBER, memberSession, "/dashboard");
    await expect(rail(page).getByRole("link", { name: "Clients" })).toBeVisible();
    await expect(rail(page).getByRole("link", { name: "Website", exact: true })).toBeVisible();
    const memberSidebar = page.getByRole("complementary", { name: "Workspace" });
    await expect(memberSidebar.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
    await expect(memberSidebar.getByRole("link", { name: /Team/ })).toHaveCount(0);
    await expect(memberSidebar.getByRole("link", { name: /Billing/ })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "member-1440.png"),
      fullPage: false,
    });

    await page.goto(`${tenantWebOrigin(PX2_PRO_MEMBER.slug)}/settings/team`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await expect(page.getByText(/tenant admins only/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /start .* trial/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /upgrade/i })).toHaveCount(0);

    await openMoreSheet(page);
    await expect(
      page.getByRole("dialog", { name: "Cohestra" }).getByRole("link", { name: /Team/ })
    ).toHaveCount(0);
    await expect(
      page.getByRole("dialog", { name: "Cohestra" }).getByRole("link", { name: /Billing/ })
    ).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "member-390-more.png"),
      fullPage: false,
    });
  });

  test("Basic member Website is ask-admin and never checkout", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(60_000);
    const session = await loginOrSkip(request, PX2_BASIC_MEMBER);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, PX2_BASIC_MEMBER, session, "/dashboard/website");
    await expect(
      rail(page).getByRole("link", { name: "Website, locked, requires Core plan" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /unlock a branded public homepage/i })).toBeVisible();
    await expect(page.getByText(/ask a tenant admin/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /start .* trial/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /upgrade to/i })).toHaveCount(0);
  });

  test("direct API: plan lock stays plan_locked and member Team stays Forbid", async ({
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    const basic = await loginOrSkip(request, PX2_BASIC_TENANT);
    const member = await loginOrSkip(request, PX2_PRO_MEMBER);
    const pro = await loginOrSkip(request, DEFAULT_PRO_TENANT);

    const basicSite = await request.get(`${API_BASE}/api/v1/admin/site`, {
      headers: {
        Authorization: `Bearer ${basic.accessToken}`,
        Host: tenantApiHost(PX2_BASIC_TENANT.slug),
      },
    });
    expect(basicSite.status()).toBe(403);
    const siteBody = (await basicSite.json()) as { errorCode?: string; requiredPlan?: string };
    expect(siteBody.errorCode).toBe("plan_locked");
    expect(siteBody.requiredPlan).toBe("Core");

    const basicCampaigns = await request.get(`${API_BASE}/api/v1/admin/campaigns`, {
      headers: {
        Authorization: `Bearer ${basic.accessToken}`,
        Host: tenantApiHost(PX2_BASIC_TENANT.slug),
      },
    });
    expect(basicCampaigns.status()).toBe(403);
    const campaignBody = (await basicCampaigns.json()) as { errorCode?: string };
    expect(campaignBody.errorCode).toBe("plan_locked");

    const memberTeam = await request.get(`${API_BASE}/api/v1/admin/team`, {
      headers: {
        Authorization: `Bearer ${member.accessToken}`,
        Host: tenantApiHost(PX2_PRO_MEMBER.slug),
      },
    });
    expect(memberTeam.status()).toBe(403);
    const teamText = await memberTeam.text();
    expect(teamText.toLowerCase()).not.toContain("plan_locked");

    const proSite = await request.get(`${API_BASE}/api/v1/admin/site`, {
      headers: {
        Authorization: `Bearer ${pro.accessToken}`,
        Host: tenantApiHost(DEFAULT_PRO_TENANT.slug),
      },
    });
    expect(proSite.status()).toBe(200);
  });
});
