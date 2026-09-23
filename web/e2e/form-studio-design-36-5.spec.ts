import { expect, test } from "@playwright/test";

import { provisionOwnedActivity } from "./helpers/e2e-owned-fixtures";
import { MARINA_LIKE_FORM_SCHEMA, SINGLE_PAGE_CENTERED_THEME } from "./helpers/owned-fixture-data";
import {
  applyRegistrationTheme,
  loginOperatorSession,
  tenantWebBase,
} from "./helpers/registration-e2e-api";

test.describe("Story 36.5 — public design tokens and Modern Centered style", () => {
  test.describe.configure({ mode: "serial" });

  let token: string;
  let slug: string;
  let activityId: string;
  let activityRecord: Record<string, unknown>;

  test.beforeAll(async ({ request }, testInfo) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    const session = await loginOperatorSession(request);
    token = session.accessToken;
    const owned = await provisionOwnedActivity(request, session, {
      ownerKey: "38-3-365",
      workerIndex: testInfo.workerIndex,
      theme: SINGLE_PAGE_CENTERED_THEME,
      formSchema: MARINA_LIKE_FORM_SCHEMA,
      publish: true,
    });
    slug = owned.slug;
    activityId = owned.id;
    activityRecord = owned.record;
  });

  test("Modern vs Minimal style on public Modern Centered shell", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

    await applyRegistrationTheme(request, token, activityId, activityRecord, {
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
      experience: {
        layout: "centered",
        style: "modern",
        flow: "single-page",
        heroDisplay: "cover",
      },
    });

    const base = tenantWebBase();
    await page.goto(`${base}/register/${slug}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-registration-shell="modern-centered"]')).toHaveAttribute(
      "data-registration-style",
      "modern"
    );

    await applyRegistrationTheme(request, token, activityId, activityRecord, {
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
      experience: {
        layout: "centered",
        style: "minimal",
        flow: "single-page",
        heroDisplay: "cover",
      },
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-registration-shell="modern-centered"]')).toHaveAttribute(
      "data-registration-style",
      "minimal"
    );
  });

  test("Compact typography token on public form", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

    await applyRegistrationTheme(request, token, activityId, activityRecord, {
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
      experience: {
        layout: "centered",
        style: "modern",
        flow: "single-page",
        heroDisplay: "cover",
      },
      designTokens: { typographyScale: "compact" },
    });

    await page.goto(`${tenantWebBase()}/register/${slug}`, { waitUntil: "domcontentloaded" });
    const form = page.locator('[data-registration-shell="modern-centered"] form').first();
    await expect(form).toBeVisible({ timeout: 30_000 });
    await expect(form).toHaveClass(/space-y-3\.5/);
  });
});
