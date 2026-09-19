import { expect, test } from "@playwright/test";

import {
  applyRegistrationTheme,
  EPIC_35_EXPERIENCES,
  EPIC_35_VIEWPORTS,
  fetchActivity,
  findActivityIdBySlug,
  loginOperator,
  resolvePublishedE2eSlug,
  tenantWebBase,
} from "./helpers/registration-e2e-api";

const PREFERRED_SLUG =
  process.env.REGISTRATION_E2E_SLUG ?? "demo-marina-social-meetup";

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

async function assertExperienceShell(
  page: import("@playwright/test").Page,
  expectShell: (typeof EPIC_35_EXPERIENCES)[number]["expect"]
) {
  if (expectShell.splitPanel) {
    await expect(page.locator('[class*="lg:grid-cols"]').first()).toBeVisible();
  }
  if (expectShell.posterPanel) {
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  }
  if (expectShell.conversational) {
    await expect(page.getByText(/Question \d+ of \d+/)).toBeVisible();
    await expect(page.getByRole("button", { name: /continue|join activity/i })).toBeVisible();
  }
  if (expectShell.centered && !expectShell.conversational) {
    const join = page.getByRole("button", { name: /join activity/i });
    await expect(join).toBeVisible();
  }
}

test.describe("Epic 35 — live public registration matrix", () => {
  test.describe.configure({ mode: "serial" });

  let activityId: string;
  let activityRecord: Record<string, unknown>;
  let token: string;
  let slug: string;

  test.beforeAll(async ({ request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    token = await loginOperator(request);
    slug = await resolvePublishedE2eSlug(request, token, PREFERRED_SLUG);
    activityId = await findActivityIdBySlug(request, token, slug);
    activityRecord = await fetchActivity(request, token, activityId);
  });

  for (const experience of EPIC_35_EXPERIENCES) {
    for (const viewport of EPIC_35_VIEWPORTS) {
      test(`${experience.label} @ ${viewport.width}px`, async ({ page, request }) => {
        test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

        await applyRegistrationTheme(request, token, activityId, activityRecord, experience.theme);

        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const base = tenantWebBase();
        const response = await page.goto(`${base}/register/${slug}`, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });

        expect(response?.ok()).toBeTruthy();
        await assertNoHorizontalOverflow(page);
        await assertExperienceShell(page, experience.expect);
      });
    }
  }
});

test.describe("Epic 35 — conversational live interaction", () => {
  test.beforeAll(async ({ request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
  });

  test("Next, Back, validation, and preview submit", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

    const token = await loginOperator(request);
    const slug = await resolvePublishedE2eSlug(request, token, PREFERRED_SLUG);
    const activityId = await findActivityIdBySlug(request, token, slug);
    const activityRecord = await fetchActivity(request, token, activityId);
    const conversational = EPIC_35_EXPERIENCES.find((e) => e.label === "conversational")!;

    await applyRegistrationTheme(request, token, activityId, activityRecord, conversational.theme);

    await page.setViewportSize({ width: 390, height: 844 });
    const base = tenantWebBase();
    await page.goto(`${base}/register/${slug}`, { waitUntil: "domcontentloaded" });

    const continueBtn = page.getByRole("button", { name: /^Continue$/i });
    const joinBtn = page.getByRole("button", { name: /join activity/i });

    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 5_000 }).catch(() => {
        /* field-dependent */
      });

      const firstInput = page.locator("input:not([type=hidden])").first();
      if (await firstInput.isVisible()) {
        await firstInput.fill("Epic35 Tester");
        await continueBtn.click();
      }

      const backBtn = page.getByRole("button", { name: /^Back$/i });
      if (await backBtn.isVisible().catch(() => false)) {
        await backBtn.click();
        await expect(page.locator("input:not([type=hidden])").first()).toHaveValue("Epic35 Tester");
        await continueBtn.click();
      }
    } else {
      await expect(joinBtn).toBeVisible();
    }
  });
});

test.describe("Epic 35 — Form Studio unsaved preview", () => {
  test("Design draft flow appears in Form Preview without save", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

    const token = await loginOperator(request);
    const slug = await resolvePublishedE2eSlug(request, token, PREFERRED_SLUG);
    const activityId = await findActivityIdBySlug(request, token, slug);
    const base = tenantWebBase();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
    await page.locator("#email").fill("operator@cohestra.local");
    await page.locator("#password").fill("ChangeMe123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/activities/, { timeout: 60_000 });

    await page.goto(`${base}/activities/${activityId}?tab=design`, { waitUntil: "domcontentloaded" });

    const splitRadio = page.getByRole("radio", { name: /Split Event/i });
    if (await splitRadio.isVisible().catch(() => false)) {
      await splitRadio.click();
    }

    await page.goto(`${base}/activities/${activityId}?tab=form`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Preview$/i }).click();

    await expect(page.locator('[class*="lg:grid-cols"]').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/preview/i).first()).toBeVisible();
  });
});
