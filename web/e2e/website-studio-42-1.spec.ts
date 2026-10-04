import fs from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

import {
  PX2_BASIC_MEMBER,
  PX2_BASIC_TENANT,
  PX2_CORE_TENANT,
  PX2_PRO_MEMBER,
  loginOwnedTenant,
} from "./helpers/e2e-owned-fixtures";
import { resolveE2eApiBase, tenantApiHost, tenantWebOrigin } from "./helpers/owned-fixture-data";
import {
  loginOperatorSession,
  seedOperatorAuthSession,
  tenantWebBase,
  waitForOperatorWorkspace,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-42-1"
);
const API_BASE = resolveE2eApiBase();

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "767x900", width: 767, height: 900 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1279x900", width: 1279, height: 900 },
  { name: "1280x900", width: 1280, height: 900 },
  { name: "1440x900", width: 1440, height: 900 },
] as const;

type AxeViolation = {
  id: string;
  impact: string | null;
  description: string;
};

function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function fixtureDraft(siteName = "Harbourline Studio") {
  return {
    schemaVersion: 1,
    siteName,
    accentColor: "#c45c26",
    logoAssetId: null,
    presetId: "community",
    sections: [
      {
        id: "hero-1",
        type: "hero",
        enabled: true,
        order: 0,
        props: {
          headline: "Community activities. Meaningful connections.",
          primaryCta: { label: "Browse events", target: "scroll-upcoming" },
        },
      },
    ],
  };
}

function fixtureAdmin(overrides: Record<string, unknown> = {}) {
  const draft =
    (overrides.draft as ReturnType<typeof fixtureDraft> | undefined) ?? fixtureDraft();
  return {
    published: fixtureDraft("Harbourline Live"),
    draftUpdatedAt: "2026-10-04T08:00:00.000Z",
    publishedAt: "2026-10-03T08:00:00.000Z",
    publishedByUserId: "user-1",
    hasUnpublishedChanges: true,
    canRevertPublished: true,
    previousPublishedAt: "2026-10-01T08:00:00.000Z",
    savedTemplates: [],
    builderLocked: false,
    ...overrides,
    draft,
  };
}

async function openAuthed(
  page: Page,
  session: Awaited<ReturnType<typeof loginOperatorSession>>,
  route = "/dashboard/website",
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

async function skipWebsiteTour(page: Page): Promise<void> {
  await page.evaluate(() => {
    const slug =
      window.location.hostname.split(".")[0] ||
      "default";
    const completed = `activity-lead:website-builder-tour-completed:${encodeURIComponent(slug.toLowerCase())}`;
    const visited = `activity-lead:website-builder-visited:${encodeURIComponent(slug.toLowerCase())}`;
    window.localStorage.setItem(completed, "1");
    window.localStorage.setItem(visited, "1");
  });
  const skipTour = page.getByRole("button", { name: "Skip tour" });
  if (await skipTour.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await skipTour.click();
    await expect(skipTour).toHaveCount(0);
  }
}

async function assertNoOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  expect(overflow, label).toBe(false);
}

async function assertMinTouch(locator: Locator, label: string): Promise<void> {
  await expect(locator, label).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} bounding box`).toBeTruthy();
  expect(box?.height ?? 0, `${label} height`).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0, `${label} width`).toBeGreaterThanOrEqual(44);
}

async function assertAxe(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .exclude("[disabled]")
    .exclude('[aria-disabled="true"]')
    .exclude(".border-warn\\/30")
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
        "link-name",
        "list",
        "listitem",
        "button-name",
      ].includes(violation.id)
  );
  expect(blocking, `${label}: ${JSON.stringify(blocking, null, 2)}`).toEqual([]);
}

async function assertOneMainOneH1(page: Page): Promise<void> {
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Website Studio", level: 1 })).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);
}

async function stubStudioReads(page: Page, admin = fixtureAdmin()): Promise<void> {
  await page.route("**/api/v1/admin/site", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await json(route, admin);
  });
  await page.route("**/api/v1/admin/activities**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await json(route, { items: [], page: 1, pageSize: 50, totalCount: 0 });
  });
  await page.route("**/api/v1/public/site**", async (route) => {
    await json(route, {
      published: admin.draft,
      publishedAt: admin.publishedAt,
      upcomingActivities: [],
    });
  });
}

test.describe("Story 42.1 — Website Studio chrome and placement", () => {
  test("Basic admin lock has no editor and no site 500", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(90_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const siteGets: number[] = [];
    page.on("response", (res) => {
      if (res.url().includes("/api/v1/admin/site") && res.request().method() === "GET") {
        siteGets.push(res.status());
      }
    });

    const basic = await loginOwnedTenant(request, PX2_BASIC_TENANT);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, basic, "/dashboard/website", tenantWebOrigin(PX2_BASIC_TENANT.slug));
    await expect(page.getByRole("heading", { name: "Website Studio", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: /unlock a branded public homepage/i })).toBeVisible();
    await expect(page.locator("#website-builder-toolbar")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Skip tour" })).toHaveCount(0);
    expect(siteGets.some((status) => status >= 500), "Basic must not receive a site 500").toBe(
      false
    );
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "basic-lock-1440.png"),
      fullPage: true,
    });
  });

  test("Basic member stays ask-admin without checkout", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(90_000);

    let session: Awaited<ReturnType<typeof loginOwnedTenant>>;
    try {
      session = await loginOwnedTenant(request, PX2_BASIC_MEMBER);
    } catch (error) {
      test.skip(true, `Basic member fixture unavailable: ${String(error)}`);
      return;
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/dashboard/website", tenantWebOrigin(PX2_BASIC_MEMBER.slug));
    await expect(page.getByRole("heading", { name: "Website Studio", level: 1 })).toBeVisible();
    await expect(page.getByText(/ask a tenant admin/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /start core/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /billing\/checkout/i })).toHaveCount(0);
    await expect(page.locator("#website-builder-toolbar")).toHaveCount(0);
  });

  test("Core, Pro, and Pro member reach Website Studio", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const core = await loginOwnedTenant(request, PX2_CORE_TENANT);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, core, "/dashboard/website", tenantWebOrigin(PX2_CORE_TENANT.slug));
    await skipWebsiteTour(page);
    await expect(page.getByRole("heading", { name: "Website Studio", level: 1 })).toBeVisible();
    await expect(page.locator("#website-builder-toolbar")).toBeVisible();
    await expect(page.getByRole("heading", { name: /unlock a branded public homepage/i })).toHaveCount(
      0
    );

    const pro = await loginOperatorSession(request);
    await openAuthed(page, pro, "/dashboard/website");
    await skipWebsiteTour(page);
    await expect(page.locator("#website-builder-toolbar")).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "entitled-editor-1440.png"),
      fullPage: true,
    });

    const member = await loginOwnedTenant(request, PX2_PRO_MEMBER);
    await openAuthed(page, member, "/dashboard/website");
    await skipWebsiteTour(page);
    await expect(page.getByRole("heading", { name: "Website Studio", level: 1 })).toBeVisible();
    await expect(page.locator("#website-builder-toolbar")).toBeVisible();
    await expect(page.getByRole("link", { name: /billing\/checkout/i })).toHaveCount(0);
  });

  test("unknown plan stays pending without a checkout SKU", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(90_000);
    const session = await loginOperatorSession(request);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route("**/api/v1/admin/shell**", async (route) => {
      const response = await route.fetch();
      const raw = (await response.json()) as Record<string, unknown>;
      raw.plan = "FuturePlan";
      raw.Plan = "FuturePlan";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(raw),
      });
    });
    await openAuthed(page, session);
    await expect(page.getByRole("heading", { name: "Website Studio", level: 1 })).toBeVisible();
    await expect(page.getByText(/checking website studio access/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /start core/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /unlock a branded public homepage/i })).toHaveCount(
      0
    );
    await expect(page.locator("#website-builder-toolbar")).toHaveCount(0);
    await page.unroute("**/api/v1/admin/shell**");
  });

  test("role denial is distinct from plan lock", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(90_000);
    const session = await loginOperatorSession(request);
    await stubStudioReads(page);
    await page.route("**/api/v1/admin/site", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Forbidden",
          detail: "Your role cannot open Website Studio.",
          status: 403,
        }),
      });
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session);
    await expect(page.getByRole("heading", { name: "You don’t have access to Website Studio" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /unlock a branded public homepage/i })).toHaveCount(
      0
    );
    await expect(page.locator("#website-builder-toolbar")).toHaveCount(0);
  });

  test("title, rail, More placement, and compositions", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(240_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session);
    await skipWebsiteTour(page);
    await expect(page.getByRole("heading", { name: "Website Studio", level: 1 })).toBeVisible();
    const rail = page.getByRole("navigation", { name: "Admin navigation" });
    await expect(rail.getByRole("link", { name: "Website" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Website Studio" })).toHaveCount(0);

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await skipWebsiteTour(page);
      await expect(page.getByRole("heading", { name: "Website Studio", level: 1 })).toBeVisible();
      await assertNoOverflow(page, `${viewport.name} overflow`);

      if (viewport.width < 1024) {
        await expect(page.getByRole("tablist", { name: "Website Studio workspace" })).toBeVisible();
        await expect(page.getByRole("tab", { name: "Edit" })).toBeVisible();
        await expect(page.getByRole("tab", { name: "Preview" })).toBeVisible();
        await expect(page.getByRole("tab", { name: "Split" })).toHaveCount(0);
        await expect(page.locator("#website-builder-live-preview")).toHaveCount(0);
      } else {
        await expect(page.getByRole("tablist", { name: "Workspace view" })).toBeVisible();
        await expect(page.getByRole("tab", { name: "Build" })).toBeVisible();
        await expect(page.getByRole("tab", { name: "Preview" })).toBeVisible();
        if (viewport.width >= 1280) {
          await expect(page.getByRole("tab", { name: "Split" })).toBeVisible();
        } else {
          await expect(page.getByRole("tab", { name: "Split" })).toHaveCount(0);
          await expect(page.locator("#website-builder-live-preview")).toHaveCount(0);
        }
      }

      await page.screenshot({
        path: path.join(evidenceDir, "viewports", `studio-${viewport.name}.png`),
        fullPage: true,
      });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Website" })).toHaveCount(0);
    const more = page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: /More/ });
    await more.click();
    const moreDest = page.getByRole("navigation", { name: "More destinations" });
    await expect(moreDest.getByRole("link", { name: "Website" })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("tab", { name: "Edit" }).click();
    await assertMinTouch(page.getByRole("tab", { name: "Edit" }), "390 Edit");
    await assertMinTouch(page.getByRole("button", { name: /save draft/i }), "390 Save");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "edit-390.png"),
      fullPage: true,
    });
    await page.getByRole("tab", { name: "Preview" }).click();
    await expect(page.locator("#website-builder-live-preview")).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "preview-390.png"),
      fullPage: true,
    });
  });

  test("Edit/Preview draft continuity and hidden preview unmount", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    const session = await loginOperatorSession(request);
    await stubStudioReads(page);

    await page.setViewportSize({ width: 1024, height: 768 });
    await openAuthed(page, session);
    await skipWebsiteTour(page);
    await expect(page.getByRole("tab", { name: "Split" })).toHaveCount(0);
    await expect(page.locator("#website-builder-live-preview")).toHaveCount(0);
    await expect(page.locator("[data-site-preview-pane]")).toHaveCount(0);
    const siteName = page.getByLabel("Site name");
    await siteName.fill("Draft continuity marker");
    await expect(page.getByText(/unsaved changes/i)).toBeVisible();
    await expect(page.locator("#website-builder-live-preview")).toHaveCount(0);
    await expect(page.locator("[data-site-preview-pane]")).toHaveCount(0);
    await page.getByRole("tab", { name: "Preview" }).click();
    await expect(page.getByRole("region", { name: "Website preview" })).toBeVisible();
    await expect(page.getByText("Draft continuity marker").first()).toBeVisible();
    await page.getByRole("tab", { name: "Build" }).click();
    await expect(page.locator("#website-builder-live-preview")).toHaveCount(0);
    await expect(page.getByLabel("Site name")).toHaveValue("Draft continuity marker");

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("tab", { name: "Split" }).click();
    await expect(page.getByLabel("Site name")).toBeVisible();
    await expect(page.locator("#website-builder-live-preview")).toBeVisible();
  });

  test("publish and revert persistent status with AlertDialog", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);
    const saved = fixtureAdmin({
      hasUnpublishedChanges: true,
      canRevertPublished: true,
    });
    await stubStudioReads(page, saved);
    let publishCount = 0;
    let revertCount = 0;
    await page.route("**/api/v1/admin/site/publish", async (route) => {
      publishCount += 1;
      if (publishCount === 1) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Publish failed for Website Studio QA." }),
        });
        return;
      }
      await json(route, {
        ...saved,
        hasUnpublishedChanges: false,
        published: saved.draft,
        publishedAt: "2026-10-04T12:00:00.000Z",
      });
    });
    await page.route("**/api/v1/admin/site/revert-published", async (route) => {
      revertCount += 1;
      if (revertCount === 1) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Revert failed for Website Studio QA." }),
        });
        return;
      }
      await json(route, {
        ...saved,
        draft: fixtureDraft("Harbourline Live"),
        publishedAt: "2026-10-01T08:00:00.000Z",
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session);
    await skipWebsiteTour(page);
    await page.locator("#website-builder-publish").click();
    const publishDialog = page.getByRole("alertdialog", { name: "Publish homepage?" });
    await expect(publishDialog).toBeVisible();
    await publishDialog.getByRole("button", { name: /publish homepage|publish anyway/i }).click();
    await expect(page.getByRole("status").filter({ hasText: /could not publish|publish failed/i })).toBeVisible();

    await page.locator("#website-builder-publish").click();
    await page
      .getByRole("alertdialog", { name: "Publish homepage?" })
      .getByRole("button", { name: /publish homepage|publish anyway/i })
      .click();
    const liveDialog = page.getByRole("alertdialog", { name: "Your homepage is live" });
    await expect(liveDialog).toBeVisible();
    await liveDialog.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("status").filter({ hasText: /homepage published/i })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "publish-success-1440.png"),
      fullPage: true,
    });

    await page.getByRole("tab", { name: "Templates" }).click();
    const revertTrigger = page.getByRole("button", { name: "Revert to last published" });
    const revert = page.getByRole("alertdialog", { name: "Revert live homepage?" });
    await revertTrigger.click();
    await expect(revert).toBeVisible();
    await expect(revert.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(revert.getByRole("button", { name: "Revert live site" })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "revert-confirm-1440.png"),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(revert).toHaveCount(0);

    await revertTrigger.click();
    await expect(revert).toBeVisible();
    await revert.getByRole("button", { name: "Revert live site" }).click();
    await expect(revert).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: /revert failed|could not revert/i })).toBeVisible();
    await expect(page.getByLabel("Site name")).toHaveValue("Harbourline Studio");

    await revertTrigger.click();
    await expect(revert).toBeVisible();
    await revert.getByRole("button", { name: "Revert live site" }).click();
    await expect(page.getByRole("status").filter({ hasText: /live homepage restored/i })).toBeVisible();
    expect(publishCount).toBe(2);
    expect(revertCount).toBe(2);
  });

  test("tour skip, skip-link, tenant scope, and a11y surfaces", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session);
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        if (key.includes("website-builder")) {
          localStorage.removeItem(key);
        }
      }
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    const skipTour = page.getByRole("button", { name: "Skip tour" });
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await expect(skipTour).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("region", { name: "Start with a template" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".fixed.inset-0.bg-black\\/55")).toHaveCount(0);
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main-content")).toBeFocused();
    await expect(skipTour).toBeVisible();
    const copyLink = page.getByRole("button", { name: "Copy link" });
    await copyLink.click();
    await expect(copyLink).toBeVisible();
    await skipTour.click();
    await expect(skipTour).toHaveCount(0);

    const scopedKeys = await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.includes("website-builder-tour-completed"))
    );
    expect(scopedKeys.some((key) => /website-builder-tour-completed:.+/.test(key))).toBe(true);
    expect(scopedKeys.every((key) => !key.endsWith("website-builder-tour-completed"))).toBe(true);

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("button", { name: "Skip tour" })).toHaveCount(0);

    await assertOneMainOneH1(page);
    await assertAxe(page, "website studio 1440");

    await page.evaluate(() => {
      window.localStorage.setItem("cohestra-theme-operator", "dark");
      document.documentElement.classList.add("dark");
    });
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("heading", { name: "Website Studio", level: 1 })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "dark-1440.png"),
      fullPage: true,
    });
    await page.evaluate(() => {
      window.localStorage.setItem("cohestra-theme-operator", "light");
      document.documentElement.classList.remove("dark");
    });

    await page.emulateMedia({ forcedColors: "active" });
    await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "forced-colors-1440.png"),
      fullPage: true,
    });
    await page.emulateMedia({ forcedColors: "none" });

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("#website-builder-toolbar")).toBeVisible();
    await page.emulateMedia({ reducedMotion: "no-preference" });

    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    await expect(page.getByRole("heading", { name: "Website Studio", level: 1 })).toBeVisible();
    await assertNoOverflow(page, "200% zoom overflow");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "zoom-200-1440.png"),
      fullPage: true,
    });
    await page.evaluate(() => {
      document.documentElement.style.zoom = "";
    });
  });

  test("same-entitlement Core token cannot read default site", async ({ request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    const core = await loginOwnedTenant(request, PX2_CORE_TENANT);
    const foreign = await request.get(`${API_BASE}/api/v1/admin/site`, {
      headers: {
        Authorization: `Bearer ${core.accessToken}`,
        Host: tenantApiHost("default"),
      },
    });
    expect([401, 403, 404]).toContain(foreign.status());
    const foreignBody = await foreign.text();
    expect(foreignBody).not.toMatch(/TENANT_A_SITE_NAME_MARKER/);

    const own = await request.get(`${API_BASE}/api/v1/admin/site`, {
      headers: {
        Authorization: `Bearer ${core.accessToken}`,
        Host: tenantApiHost(PX2_CORE_TENANT.slug),
      },
    });
    expect(own.status()).toBe(200);
  });
});
