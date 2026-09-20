import { expect, test, type Page } from "@playwright/test";

import {
  applyRegistrationTheme,
  createDraftActivity,
  fetchActivity,
  loginOperator,
  publishActivity,
  saveActivityFormSchema,
  tenantWebBase,
} from "./helpers/registration-e2e-api";

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
] as const;

const REPRESENTATIVE_SCHEMA = {
  version: 2,
  fields: [
    { id: "first_name", type: "text", label: "First name", required: true },
    { id: "last_name", type: "text", label: "Last name", required: true },
    { id: "email", type: "email", label: "Email", required: true },
    {
      id: "shirt",
      type: "select",
      label: "Shirt size",
      required: true,
      options: [
        { value: "s", label: "Small" },
        { value: "m", label: "Medium" },
        { value: "l", label: "Large" },
      ],
    },
    {
      id: "consent",
      type: "consent",
      label: "I agree to the community guidelines",
      required: true,
      consentText: "I agree to the community guidelines",
    },
  ],
  composition: [
    {
      id: "h1",
      kind: "content",
      contentType: "heading",
      content: { text: "Join this activity", level: 2 },
    },
    {
      id: "p1",
      kind: "content",
      contentType: "paragraph",
      content: { text: "Tell us who you are so we can save your place." },
    },
    {
      id: "s1",
      kind: "section",
      title: "Your details",
      description: "Required for check-in",
      children: [
        {
          id: "cols",
          kind: "columns",
          columns: [
            [{ id: "fn", kind: "fieldRef", fieldId: "first_name" }],
            [{ id: "ln", kind: "fieldRef", fieldId: "last_name" }],
          ],
        },
        { id: "em", kind: "fieldRef", fieldId: "email" },
        { id: "sz", kind: "fieldRef", fieldId: "shirt" },
        { id: "cn", kind: "fieldRef", fieldId: "consent" },
      ],
    },
  ],
};

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("Story 36.5 — live visual and token checkpoint", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  let token: string;
  let slug: string;
  let activityId: string;
  let activityRecord: Record<string, unknown>;

  test.beforeAll(async ({ request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    token = await loginOperator(request);
    const created = await createDraftActivity(request, token, "e2e-365");
    activityId = created.id;
    slug = created.slug;
    await saveActivityFormSchema(request, token, activityId, REPRESENTATIVE_SCHEMA);
    activityRecord = await fetchActivity(request, token, activityId);
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
      designTokens: {
        typographyScale: "default",
        fieldSize: "default",
        fieldRadius: "md",
        buttonWidth: "full",
        surfaceEmphasis: "soft",
      },
    });
    await publishActivity(request, token, activityId);
    activityRecord = await fetchActivity(request, token, activityId);
  });

  test("Modern vs Minimal public shells are distinct", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    const base = tenantWebBase();

    await applyRegistrationTheme(request, token, activityId, activityRecord, {
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: activityRecord.heroImageUrl as string | null,
      experience: {
        layout: "centered",
        style: "modern",
        flow: "single-page",
        heroDisplay: "cover",
      },
    });
    await page.goto(`${base}/register/${slug}`, { waitUntil: "domcontentloaded" });
    const modern = page.locator('[data-registration-shell="modern-centered"]');
    await expect(modern).toHaveAttribute("data-registration-style", "modern");
    await expect(page.getByRole("heading", { name: /Join this activity/i })).toBeVisible();
    await expect(page.getByLabel(/^First name/i)).toBeVisible();
    await expect(page.getByLabel(/^Last name/i)).toBeVisible();
    const modernBox = await modern.boundingBox();

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
    await expect(modern).toHaveAttribute("data-registration-style", "minimal");
    const minimalBox = await modern.boundingBox();
    expect(modernBox && minimalBox).toBeTruthy();
  });

  test("token matrix: compact + auto button persist on public", async ({ page, request }) => {
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
      designTokens: {
        typographyScale: "compact",
        fieldSize: "default",
        fieldRadius: "sm",
        buttonWidth: "auto",
        surfaceEmphasis: "flat",
      },
    });

    await page.goto(`${tenantWebBase()}/register/${slug}`, { waitUntil: "domcontentloaded" });
    const form = page.locator('[data-registration-shell="modern-centered"] form').first();
    await expect(form).toHaveClass(/space-y-3\.5/);
    const cta = page.getByRole("button", { name: /join activity|register|submit/i }).first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveClass(/\bw-auto\b/);
  });

  for (const viewport of VIEWPORTS) {
    test(`responsive Modern Centered @ ${viewport.width}`, async ({ page, request }) => {
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
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`${tenantWebBase()}/register/${slug}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator('[data-registration-shell="modern-centered"]')).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByLabel(/^First name/i)).toBeVisible();
      await expect(page.getByLabel(/^Email/i)).toBeVisible();
      await assertNoHorizontalOverflow(page);
    });
  }

  test("Epic 35 shells still render after token persist", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    const base = tenantWebBase();

    await applyRegistrationTheme(request, token, activityId, activityRecord, {
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
      experience: { layout: "split", style: "modern", flow: "single-page", heroDisplay: "split" },
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/register/${slug}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[class*="lg:grid-cols"]').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);

    await applyRegistrationTheme(request, token, activityId, activityRecord, {
      preset: "classic",
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
      experience: { layout: "poster", style: "modern", flow: "single-page", heroDisplay: "cover" },
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await assertNoHorizontalOverflow(page);

  });
});
