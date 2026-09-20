import { expect, test } from "@playwright/test";

import {
  applyRegistrationTheme,
  fetchActivity,
  findActivityIdBySlug,
  loginOperator,
  resolvePublishedE2eSlug,
  tenantWebBase,
} from "./helpers/registration-e2e-api";

const PREFERRED_SLUG =
  process.env.REGISTRATION_E2E_SLUG ?? "demo-wellness-morning-yoga";

test.describe("Story 36.5 — public design tokens and Modern Centered style", () => {
  test.describe.configure({ mode: "serial" });

  let token: string;
  let slug: string;
  let activityId: string;
  let activityRecord: Record<string, unknown>;

  test.beforeAll(async ({ request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    token = await loginOperator(request);
    slug = await resolvePublishedE2eSlug(request, token, PREFERRED_SLUG);
    activityId = await findActivityIdBySlug(request, token, slug);
    activityRecord = await fetchActivity(request, token, activityId);
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
