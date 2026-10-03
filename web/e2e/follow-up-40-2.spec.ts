import fs from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  DEFAULT_PRO_TENANT,
  PX2_BASIC_TENANT,
  PX2_PRO_MEMBER,
  loginOwnedTenant,
  type OwnedTenant,
} from "./helpers/e2e-owned-fixtures";
import { resolveE2eApiBase, tenantApiHost } from "./helpers/owned-fixture-data";
import {
  loginOperatorSession,
  seedOperatorAuthSession,
  tenantWebBase,
  waitForOperatorWorkspace,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-40-2"
);

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "430x932", width: 430, height: 932 },
  { name: "390x844", width: 390, height: 844 },
] as const;

type AxeViolation = {
  id: string;
  impact: string | null;
  description: string;
};

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

async function waitForFollowUpReady(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: "Follow-up" })).toBeVisible();
  await expect(
    page
      .getByRole("radiogroup", { name: "Follow-up category" })
      .or(page.getByRole("heading", { name: "Could not load Follow-up" }))
      .or(page.getByRole("heading", { name: "You don’t have access to Follow-up" }))
  ).toBeVisible({ timeout: 20_000 });
}

async function assertNoOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  expect(overflow, label).toBe(false);
}

async function assertAxe(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = (results.violations as AxeViolation[]).filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical"
  );
  expect(serious, `${label}: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
}

function listPayload(
  items: Array<Record<string, unknown>>,
  counts: {
    dueNowCount: number;
    atRiskCount: number;
    opportunityCount: number;
    healthyCount: number;
  },
  page = 1,
  totalCount = items.length
) {
  return {
    items,
    page,
    pageSize: 25,
    totalCount,
    statusCounts: {
      newCount: 0,
      contactedCount: 0,
      activeCount: 0,
      inactiveCount: 0,
      mergeSuspectCount: 0,
      followUpDueCount: 0,
    },
    followUpCategoryCounts: counts,
  };
}

function followUpCategoryFrom(url: string): string {
  try {
    return new URL(url).searchParams.get("followUpCategory") ?? "";
  } catch {
    return "";
  }
}

test.describe("Story 40.2 — Follow-up primary room", () => {
  test("dashboard widget opens the room, filters work, and profile stays tenant-scoped", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);
    const clientsCalls: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/v1/admin/clients")) {
        clientsCalls.push(req.url());
      }
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    const viewAll = page.getByRole("link", { name: "View all" }).first();
    await expect(viewAll).toHaveAttribute("href", "/follow-up");
    await viewAll.click();
    await waitForFollowUpReady(page);
    const followUpClientCalls = clientsCalls.filter((url) => url.includes("followUpCategory="));
    expect(followUpClientCalls.length, "initial Follow-up load must request a category page").toBeGreaterThan(0);
    expect(
      followUpClientCalls.every((url) => url.includes("followUpCategory=due-now") && /[?&]page=1(?:&|$)/.test(url)),
      "initial Follow-up load must not walk later tenant pages"
    ).toBe(true);
    expect(followUpClientCalls.length, "initial Follow-up load must not fan out").toBeLessThan(3);

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main-content"
    );
    await expect(page.getByRole("navigation", { name: "Admin navigation" }).getByRole("link", { name: "Follow-up" })).toHaveAttribute(
      "aria-current",
      "page"
    );

    const filters = page.getByRole("radiogroup", { name: "Follow-up category" });
    await expect(filters.getByRole("radio", { name: /Due now/ })).toBeVisible();
    await expect(filters.getByRole("radio", { name: /At risk/ })).toBeVisible();
    await expect(filters.getByRole("radio", { name: /Opportunity/ })).toBeVisible();
    await expect(filters.getByRole("radio", { name: /Healthy/ })).toBeVisible();
    await expect(filters.getByRole("radio", { name: /Due now/ })).toHaveAttribute(
      "aria-checked",
      "true"
    );

    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "follow-up-1440-populated.png"),
      fullPage: true,
    });
    await assertAxe(page, "populated 1440");

    const categoryNames = [/Due now/, /At risk/, /Opportunity/, /Healthy/] as const;
    let openedProfile = false;
    for (const categoryName of categoryNames) {
      await filters.getByRole("radio", { name: categoryName }).click();
      const clientLink = page.getByRole("link", { name: /^Open / }).first();
      if ((await clientLink.count()) === 0) {
        continue;
      }
      const name =
        (await clientLink.getAttribute("aria-label"))
          ?.replace(/^Open /, "")
          .replace(/, (Due now|At risk|Opportunity|Healthy)$/, "") ?? "";
      await clientLink.click();
      await expect(page).toHaveURL(/\/clients\/[^/]+/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (name) {
        await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
      }
      openedProfile = true;
      await page.goBack();
      await waitForFollowUpReady(page);
      break;
    }
    expect(openedProfile || (await page.getByRole("heading", { name: /No one/ }).count()) > 0).toBe(
      true
    );

    await filters.getByRole("radio", { name: /Healthy/ }).click();
    await expect(page).toHaveURL(/category=healthy/);
    await expect(filters.getByRole("radio", { name: /Healthy/ })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    const healthyHref = page.url();
    await filters.getByRole("radio", { name: /Healthy/ }).click();
    expect(page.url()).toBe(healthyHref);

    await page.getByRole("link", { name: "Skip to main content" }).focus();
    await page.keyboard.press("Enter");
    let focusedRole = "";
    for (let index = 0; index < 16; index += 1) {
      await page.keyboard.press("Tab");
      focusedRole = await page.evaluate(() => document.activeElement?.getAttribute("role") ?? "");
      if (focusedRole === "radio") {
        break;
      }
    }
    expect(focusedRole).toBe("radio");
    const ring = await page.evaluate(() => {
      const node = document.activeElement;
      return node ? window.getComputedStyle(node).boxShadow : "none";
    });
    expect(ring).not.toBe("none");
  });

  test("viewports stay readable and mobile nav marks Follow-up current", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openAuthed(page, session, "/follow-up");
      await waitForFollowUpReady(page);
      await assertNoOverflow(page, `${viewport.name} overflow`);

      const dueNow = page.getByRole("radio", { name: /Due now/ });
      await expect(dueNow).toBeVisible();
      const box = await dueNow.boundingBox();
      expect(box, `${viewport.name} Due now box`).toBeTruthy();
      expect(box!.height, `${viewport.name} Due now height`).toBeGreaterThanOrEqual(44);
      expect(box!.width, `${viewport.name} Due now width`).toBeGreaterThanOrEqual(44);
      await expect(dueNow).toHaveText(/Due now/);
      await expect(page.getByRole("radio", { name: /Healthy/ })).toBeInViewport();

      if (viewport.width < 768) {
        const followUpTab = page.getByRole("navigation", { name: "Primary" }).getByRole("link", {
          name: /Follow-up/,
        });
        await expect(followUpTab).toHaveAttribute("aria-current", "page");
      }

      await page.screenshot({
        path: path.join(evidenceDir, "viewports", `follow-up-${viewport.name}.png`),
        fullPage: true,
      });
    }
  });

  test("global empty, filter empty, fetch error, and retry stay honest", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);

    const healthyOnly = {
      dueNowCount: 0,
      atRiskCount: 0,
      opportunityCount: 0,
      healthyCount: 1,
    };
    await page.route("**/api/v1/admin/clients**", async (route) => {
      const category = followUpCategoryFrom(route.request().url());
      const items =
        category === "healthy"
          ? [
              {
                id: "healthy-1",
                fullName: "Healthy Example",
                consentGiven: true,
                leadStatus: "active",
              },
            ]
          : [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(listPayload(items, healthyOnly)),
      });
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthed(page, session, "/follow-up");
    await waitForFollowUpReady(page);
    await expect(page.getByRole("heading", { name: "No one needs follow-up." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Could not load Follow-up" })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "follow-up-390-global-empty.png"),
      fullPage: true,
    });
    await assertAxe(page, "global empty");

    await page.getByRole("radio", { name: /Healthy/ }).click();
    await expect(page.getByRole("link", { name: /Open Healthy Example/ })).toBeVisible();

    await page.unroute("**/api/v1/admin/clients**");
    const attentionCounts = {
      dueNowCount: 1,
      atRiskCount: 1,
      opportunityCount: 0,
      healthyCount: 0,
    };
    await page.route("**/api/v1/admin/clients**", async (route) => {
      const category = followUpCategoryFrom(route.request().url());
      const items =
        category === "due-now"
          ? [
              {
                id: "due-1",
                fullName: "Due Example",
                consentGiven: true,
                leadStatus: "new",
              },
            ]
          : category === "at-risk"
            ? [
                {
                  id: "risk-1",
                  fullName: "Risk Example",
                  consentGiven: true,
                  leadStatus: "inactive",
                },
              ]
            : [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(listPayload(items, attentionCounts)),
      });
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await waitForFollowUpReady(page);
    await page.getByRole("radio", { name: /Opportunity/ }).click();
    await expect(page.getByRole("heading", { name: "No one in Opportunity." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No one needs follow-up." })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "follow-up-390-filter-empty.png"),
      fullPage: true,
    });

    await page.unroute("**/api/v1/admin/clients**");
    await page.route("**/api/v1/admin/clients**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Follow-up source unavailable." }),
      });
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: "Could not load Follow-up" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("heading", { name: "No one needs follow-up." })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "follow-up-390-error.png"),
      fullPage: true,
    });
    await assertAxe(page, "error");

    await page.unroute("**/api/v1/admin/clients**");
    await page.route("**/api/v1/admin/clients**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          listPayload([], {
            dueNowCount: 0,
            atRiskCount: 0,
            opportunityCount: 0,
            healthyCount: 0,
          })
        ),
      });
    });
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { name: "No one needs follow-up." })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("heading", { name: "Could not load Follow-up" })).toHaveCount(0);
  });

  test("pagination replaces the selected category page without duplicates", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    const session = await loginOperatorSession(request);
    const counts = {
      dueNowCount: 0,
      atRiskCount: 0,
      opportunityCount: 0,
      healthyCount: 26,
    };
    await page.route("**/api/v1/admin/clients**", async (route) => {
      const url = new URL(route.request().url());
      const pageNumber = Number(url.searchParams.get("page") || "1");
      const items =
        pageNumber <= 1
          ? Array.from({ length: 25 }, (_, index) => ({
              id: `healthy-${index}`,
              fullName: `Healthy ${index}`,
              consentGiven: true,
              leadStatus: "active",
            }))
          : [
              {
                id: "healthy-25",
                fullName: "Healthy 25",
                consentGiven: true,
                leadStatus: "active",
              },
            ];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(listPayload(items, counts, pageNumber, 26)),
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/follow-up?category=healthy");
    await waitForFollowUpReady(page);
    await expect(page.getByRole("link", { name: /Open Healthy 0/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Open Healthy 25/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByRole("link", { name: /Open Healthy 25/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Open Healthy 0/ })).toHaveCount(0);
  });

  test("TenantMember can open Follow-up without gaining admin settings", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    let session: Awaited<ReturnType<typeof loginOwnedTenant>>;
    try {
      session = await loginOwnedTenant(request, PX2_PRO_MEMBER);
    } catch (error) {
      test.skip(true, `Member fixture unavailable: ${String(error)}`);
      return;
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/follow-up");
    await waitForFollowUpReady(page);
    await expect(page.getByRole("heading", { level: 1, name: "Follow-up" })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Follow-up category" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Team" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Billing" })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "follow-up-1440-member.png"),
      fullPage: true,
    });
  });

  test("reduced motion makes category chrome instant", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    const session = await loginOperatorSession(request);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1024, height: 768 });
    await openAuthed(page, session, "/follow-up");
    await waitForFollowUpReady(page);
    const duration = await page.getByRole("radio", { name: /Due now/ }).evaluate((node) => {
      return window.getComputedStyle(node).transitionDuration;
    });
    expect(duration.split(",").every((part) => part.trim() === "0s")).toBe(true);
  });

  test("tenant isolation stays on the existing clients contract", async ({ request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);

    async function clientIds(tenant: OwnedTenant): Promise<string[]> {
      const session = await loginOwnedTenant(request, tenant);
      const response = await request.get(`${resolveE2eApiBase()}/api/v1/admin/clients?page=1&pageSize=100`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Host: tenantApiHost(tenant.slug),
        },
      });
      expect(response.ok(), `${tenant.slug} clients ${response.status()}`).toBeTruthy();
      const body = (await response.json()) as { items?: Array<{ id?: string }> };
      return (body.items ?? []).map((item) => String(item.id));
    }

    let defaultIds: string[] = [];
    let basicIds: string[] = [];
    try {
      defaultIds = await clientIds(DEFAULT_PRO_TENANT);
      basicIds = await clientIds(PX2_BASIC_TENANT);
    } catch (error) {
      test.skip(true, `Second tenant unavailable for isolation: ${String(error)}`);
      return;
    }

    const overlap = defaultIds.filter((id) => basicIds.includes(id));
    expect(overlap, "client ids must not leak across tenants").toEqual([]);
  });
});
