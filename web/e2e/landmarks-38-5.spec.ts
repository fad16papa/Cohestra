import fs from "node:fs";
import path from "node:path";

import { analyzeAxe } from "./helpers/analyze-axe";
import { expect, test, type Page } from "@playwright/test";

import {
  PX2_BASIC_TENANT,
  loginOwnedTenant,
  provisionOwnedActivity,
} from "./helpers/e2e-owned-fixtures";
import {
  loginOperatorSession,
  openActivityTab,
  seedOperatorAuthSession,
  tenantWebBase,
  waitForOperatorWorkspace,
  waitForReportsContent,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-38-5"
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
  nodes: Array<{ html: string; target: string[]; summary: string }>;
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

async function documentStructure(page: Page) {
  const mains = page.getByRole("main");
  const h1s = page.getByRole("heading", { level: 1 });
  const skip = page.getByRole("link", { name: "Skip to main content" });
  return {
    mainCount: await mains.count(),
    h1Count: await h1s.count(),
    h1Names: await h1s.allTextContents().then((values) =>
      values.map((value) => value.trim())
    ),
    skipCount: await skip.count(),
    mainIds: await page.locator("main").evaluateAll((nodes) =>
      nodes.map((node) => node.id)
    ),
    mainContentCount: await page.locator("#main-content").count(),
  };
}

async function assertOneMainOneH1(
  page: Page,
  expectedH1?: string | RegExp
): Promise<void> {
  const structure = await documentStructure(page);
  expect(structure.mainCount, JSON.stringify(structure)).toBe(1);
  expect(structure.h1Count, JSON.stringify(structure)).toBe(1);
  expect(structure.skipCount).toBe(1);
  expect(structure.mainContentCount).toBe(1);
  expect(structure.mainIds).toEqual(["main-content"]);
  if (expectedH1) {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(expectedH1);
  }
}

async function runAxe(page: Page): Promise<AxeViolation[]> {
  const results = await analyzeAxe(page);
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact ?? null,
    description: violation.description,
    nodes: violation.nodes.map((node) => ({
      html: node.html.slice(0, 280),
      target: node.target.map(String),
      summary: (node.failureSummary ?? "").slice(0, 400),
    })),
  }));
}

function landmarkAxeFailures(violations: AxeViolation[]): AxeViolation[] {
  return violations.filter((violation) =>
    [
      "landmark-one-main",
      "landmark-no-duplicate-banner",
      "landmark-no-duplicate-contentinfo",
      "landmark-unique",
      "landmark-banner-is-top-level",
      "landmark-main-is-top-level",
      "landmark-no-duplicate-main",
      "page-has-heading-one",
      "heading-order",
      "bypass",
      "skip-link",
      "duplicate-id",
      "duplicate-id-aria",
    ].includes(violation.id)
  );
}

async function resetSequentialFocus(page: Page): Promise<void> {
  await page.evaluate(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
    const body = document.body;
    body.setAttribute("tabindex", "-1");
    body.focus();
    body.removeAttribute("tabindex");
  });
}

async function keyboardSkipOnce(page: Page): Promise<void> {
  await resetSequentialFocus(page);
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
}

async function assertLightAppearance(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: /appearance:/i })).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveClass(/dark/);
}

test.describe("Story 38.5 — landmarks, headings, skip link", () => {
  test.describe.configure({ mode: "serial" });

  test("authenticated shell, skip, headings, axe, keyboard, and viewports", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(300_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const session = await loginOperatorSession(request);
    const origin = tenantWebBase();
    const axeReport: Array<{
      route: string;
      viewport: string;
      landmarkFailures: AxeViolation[];
      all: AxeViolation[];
    }> = [];
    const structureReport: Array<Record<string, unknown>> = [];

    const routes: Array<{ path: string; h1: string | RegExp; wait?: () => Promise<void> }> = [
      { path: "/dashboard", h1: "Dashboard" },
      { path: "/clients", h1: "Clients" },
      { path: "/activities", h1: "Activities" },
      { path: "/analytics", h1: "Analytics", wait: () => waitForReportsContent(page) },
      { path: "/follow-up", h1: "Follow-up" },
      { path: "/ai", h1: "Cohestra AI" },
      { path: "/campaigns", h1: "Campaigns" },
      { path: "/settings", h1: "Plan & limits" },
      { path: "/settings/team", h1: "Team" },
      { path: "/settings/billing", h1: "Billing" },
      { path: "/dashboard/website", h1: /Website/ },
    ];

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/dashboard", origin);
    await assertLightAppearance(page);
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await resetSequentialFocus(page);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    const focusedBox = await skip.boundingBox();
    expect(focusedBox).toBeTruthy();
    expect(focusedBox!.x).toBeGreaterThanOrEqual(0);
    expect(focusedBox!.y).toBeGreaterThanOrEqual(0);
    expect((focusedBox!.x ?? 0) + (focusedBox!.width ?? 0)).toBeLessThanOrEqual(1440 + 1);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "skip-focused-1440x900.png"),
    });
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();

    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "dashboard-heading-1440x900.png"),
      fullPage: true,
    });

    for (const route of routes) {
      await page.goto(`${origin}${route.path}`, { waitUntil: "domcontentloaded" });
      await waitForOperatorWorkspace(page);
      if (route.wait) {
        await route.wait();
      } else {
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({
          timeout: 30_000,
        });
      }
      await assertOneMainOneH1(page, route.h1);
      if (route.path === "/settings") {
        expect(await page.getByRole("heading", { name: "Default", level: 1 }).count()).toBe(0);
        expect(await page.locator("main").count()).toBe(1);
      }
      const structure = await documentStructure(page);
      structureReport.push({ route: route.path, viewport: "1440x900", ...structure });
      const violations = await runAxe(page);
      axeReport.push({
        route: route.path,
        viewport: "1440x900",
        landmarkFailures: landmarkAxeFailures(violations),
        all: violations,
      });
    }

    for (const detail of [
      {
        list: "/clients",
        link: 'a[href^="/clients/"]',
        route: "client-profile",
        url: /\/clients\/[0-9a-f-]{36}/i,
      },
      {
        list: "/activities",
        link: 'a[href^="/activities/"]:not([href*="communities"]):not([href*="categories"]):not([href$="/new"])',
        route: "activity-detail",
        url: /\/activities\/[0-9a-f-]{36}/i,
      },
    ] as const) {
      await page.goto(`${origin}${detail.list}`, { waitUntil: "domcontentloaded" });
      await waitForOperatorWorkspace(page);
      const detailLink = page.locator(detail.link).locator("visible=true").first();
      await expect(detailLink).toBeVisible({ timeout: 30_000 });
      await detailLink.click();
      await expect(page).toHaveURL(detail.url, { timeout: 30_000 });
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
        detail.route === "client-profile" ? "Clients" : "Activities"
      );
      await assertOneMainOneH1(page);
      const detailStructure = await documentStructure(page);
      structureReport.push({
        route: detail.route,
        viewport: "1440x900",
        ...detailStructure,
      });
      const detailViolations = await runAxe(page);
      axeReport.push({
        route: detail.route,
        viewport: "1440x900",
        landmarkFailures: landmarkAxeFailures(detailViolations),
        all: detailViolations,
      });
    }

    await page.goto(`${origin}/settings`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: "Plan & limits", level: 1 })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-structure-1440x900.png"),
      fullPage: true,
    });

    await page.getByRole("navigation", { name: "Admin navigation" }).getByRole("link", { name: "Dashboard" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await keyboardSkipOnce(page);
    await page.getByRole("navigation", { name: "Admin navigation" }).getByRole("link", { name: "Clients" }).click();
    await expect(page.getByRole("heading", { name: "Clients", level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await keyboardSkipOnce(page);
    await page.keyboard.press("Tab");
    const afterSkip = await page.evaluate(() => {
      const active = document.activeElement;
      const main = document.getElementById("main-content");
      return Boolean(active && main && (active === main || main.contains(active)));
    });
    expect(afterSkip).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/dashboard`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await assertOneMainOneH1(page, "Dashboard");
    await keyboardSkipOnce(page);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "skip-focused-390x844.png"),
    });
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Activities" }).click({ force: true });
    await expect(page.getByRole("heading", { name: "Activities", level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await keyboardSkipOnce(page);
    await page.getByRole("button", { name: "More" }).click({ force: true });
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await page.locator("main").count()).toBe(1);
    expect(await page.locator("#main-content").count()).toBe(1);
    expect(await page.locator('a[href="#main-content"]').count()).toBe(1);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await assertOneMainOneH1(page, "Activities");

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`${origin}/dashboard`, { waitUntil: "domcontentloaded" });
      await waitForOperatorWorkspace(page);
      await resetSequentialFocus(page);
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
      await page.screenshot({
        path: path.join(evidenceDir, "viewports", `skip-focused-${viewport.name}.png`),
      });
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${origin}/dashboard`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await assertLightAppearance(page);
    await resetSequentialFocus(page);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "skip-focused-light-1440x900.png"),
    });

    fs.writeFileSync(
      path.join(evidenceDir, "axe-route-matrix.json"),
      JSON.stringify(axeReport, null, 2)
    );
    fs.writeFileSync(
      path.join(evidenceDir, "structure-route-matrix.json"),
      JSON.stringify(structureReport, null, 2)
    );

    const landmarkGaps = axeReport.flatMap((entry) =>
      entry.landmarkFailures.map(
        (failure) => `${entry.route}: ${failure.id} (${failure.impact})`
      )
    );
    expect(landmarkGaps, landmarkGaps.join("\n")).toEqual([]);
  });

  test("Form Studio preview has no nested main or competing h1", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const session = await loginOperatorSession(request);
    const owned = await provisionOwnedActivity(request, session, {
      ownerKey: "38-5-preview",
      workerIndex: testInfo.workerIndex,
      publish: true,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openActivityTab(page, owned.id, "form", session);
    await page.locator("#form-studio-tab-preview").click();
    const preview = page.locator("#form-studio-preview-panel");
    await expect(preview).toBeVisible({ timeout: 30_000 });
    await expect(preview.locator("main")).toHaveCount(0);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(owned.name);
    await expect(preview.getByRole("heading", { level: 1 })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "form-studio-preview-1440x900.png"),
      fullPage: true,
    });
    const previewAxe = landmarkAxeFailures(await runAxe(page));
    expect(
      previewAxe,
      JSON.stringify(previewAxe, null, 2)
    ).toEqual([]);
    await page.locator("#form-studio-tab-build").click();
    await expect(page.getByRole("heading", { name: "Form builder", level: 2 })).toBeVisible({
      timeout: 30_000,
    });
    const formAxe = landmarkAxeFailures(await runAxe(page));
    expect(
      formAxe,
      JSON.stringify(formAxe, null, 2)
    ).toEqual([]);
  });

  test("standalone public registration retains main and h1", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const session = await loginOperatorSession(request);
    const owned = await provisionOwnedActivity(request, session, {
      ownerKey: "38-5-public",
      workerIndex: testInfo.workerIndex,
      publish: true,
    });
    const origin = tenantWebBase();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${origin}/register/${owned.slug}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(owned.name);
    await expect(page.getByRole("link", { name: "Skip to main content" })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "public-registration-1440x900.png"),
      fullPage: true,
    });
  });

  test("Website Studio embedded preview and Basic lock retain one main/h1", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const session = await loginOperatorSession(request);
    const origin = tenantWebBase();
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/dashboard/website", origin);
    await expect(page.locator("#website-builder-toolbar")).toBeVisible({
      timeout: 30_000,
    });
    const skipTour = page.getByRole("button", { name: "Skip tour" });
    if (await skipTour.isVisible().catch(() => false)) {
      await skipTour.click();
    }
    const previewToggle = page.getByRole("tablist", { name: "Workspace view" }).getByRole("tab", { name: /^Preview$/i });
    await expect(previewToggle).toBeVisible();
    if ((await previewToggle.getAttribute("aria-selected")) !== "true") {
      await previewToggle.click();
    }
    const previewRegion = page.getByRole("region", { name: "Website preview" });
    await expect(previewRegion).toBeVisible({ timeout: 30_000 });
    await assertOneMainOneH1(page, /Website/);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(previewRegion.locator("main")).toHaveCount(0);
    await expect(previewRegion.getByRole("heading", { level: 1 })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "website-studio-1440x900.png"),
      fullPage: true,
    });

    const basicSession = await loginOwnedTenant(request, PX2_BASIC_TENANT);
    const basicOrigin = tenantWebBase(PX2_BASIC_TENANT.slug);
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await openAuthed(page, basicSession, "/dashboard/website", basicOrigin);
    await expect(
      page.getByRole("heading", { name: /unlock a branded public homepage/i })
    ).toBeVisible({ timeout: 30_000 });
    await assertOneMainOneH1(page, "Website Studio");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "website-basic-lock-1440x900.png"),
      fullPage: true,
    });
  });
});
