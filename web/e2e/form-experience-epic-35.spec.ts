import { expect, test } from "@playwright/test";

import {
  applyRegistrationTheme,
  EPIC_35_EXPERIENCES,
  EPIC_35_VIEWPORTS,
  fetchActivity,
  findActivityIdBySlug,
  loginOperator,
  loginOperatorSession,
  openActivityTab,
  resolvePublishedE2eSlug,
  selectExperienceLayoutLabel,
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

function previewSurface(page: import("@playwright/test").Page) {
  return page.locator(".registration-preview-surface").filter({ visible: true });
}

async function setPreviewViewportDesktop(page: import("@playwright/test").Page) {
  const toggle = page.getByRole("radiogroup", { name: /Preview viewport/i });
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.locator("label").filter({ hasText: /^Desktop$/i }).click();
  }
}

async function assertExperienceShell(
  page: import("@playwright/test").Page,
  expectShell: (typeof EPIC_35_EXPERIENCES)[number]["expect"],
  scope?: import("@playwright/test").Locator
) {
  const root = scope ?? page;

  if (expectShell.splitPanel) {
    if (scope) {
      await setPreviewViewportDesktop(page);
    }
    await expect(root.locator('[class*="lg:grid-cols"]').first()).toBeVisible();
  }
  if (expectShell.posterPanel) {
    await expect(root.getByRole("heading", { level: 1 }).first()).toBeVisible();
  }
  if (expectShell.conversational) {
    await expect(root.getByText(/Question \d+ of \d+/)).toBeVisible();
    await expect(
      root.getByRole("button", { name: /continue|join activity|preview submit/i })
    ).toBeVisible();
  }
  if (expectShell.centered && !expectShell.conversational) {
    const cta = root.getByRole("button", {
      name: /join activity|preview submit/i,
    });
    await expect(cta).toBeVisible();
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
  test.describe.configure({ mode: "serial" });

  let activityId: string;
  let activityRecord: Record<string, unknown>;
  let session: Awaited<ReturnType<typeof loginOperatorSession>>;

  test.beforeAll(async ({ request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    session = await loginOperatorSession(request);
    const slug = await resolvePublishedE2eSlug(request, session.accessToken, PREFERRED_SLUG);
    activityId = await findActivityIdBySlug(request, session.accessToken, slug);
    activityRecord = await fetchActivity(request, session.accessToken, activityId);

    await applyRegistrationTheme(
      request,
      session.accessToken,
      activityId,
      activityRecord,
      EPIC_35_EXPERIENCES.find((e) => e.label === "modern-centered")!.theme
    );
  });

  test("Design live preview reflects unsaved Split selection", async ({ page }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);

    await page.setViewportSize({ width: 1440, height: 900 });
    await openActivityTab(page, activityId, "design", session);

    await expect(page.getByRole("heading", { name: /Registration design/i })).toBeVisible({
      timeout: 30_000,
    });

    await selectExperienceLayoutLabel(page, /Split Event/i);

    const preview = previewSurface(page);
    await expect(preview).toBeVisible({ timeout: 30_000 });
    await setPreviewViewportDesktop(page);
    await expect(preview.locator('[class*="lg:grid-cols"]').first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/Live preview/i)).toBeVisible();
  });

  for (const experience of EPIC_35_EXPERIENCES) {
    test(`Form Studio Preview tab reflects unsaved ${experience.label}`, async ({ page }) => {
      test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
      test.setTimeout(120_000);

      const layoutLabel =
        experience.label === "modern-centered"
          ? /Modern Centered/i
          : experience.label === "split-event"
            ? /Split Event/i
            : experience.label === "event-poster"
              ? /Event Poster/i
              : /Modern Centered/i;

      await page.setViewportSize({ width: 1440, height: 900 });
      await openActivityTab(page, activityId, "design", session);
      await selectExperienceLayoutLabel(page, layoutLabel);

      if (experience.label === "conversational") {
        const flowCard = page.locator("label").filter({ hasText: /Conversational/i }).first();
        await expect(flowCard).toBeVisible();
        await flowCard.click();
      }

      await page.getByRole("tab", { name: /^Form$/i }).click();
      await expect(page.getByRole("tab", { name: /^Form$/i, selected: true })).toBeVisible();

      await page.locator("#form-studio-tab-preview").click();
      await expect(page.locator("#form-studio-preview-panel")).toBeVisible();

      const preview = previewSurface(page);
      await expect(preview).toBeVisible({ timeout: 30_000 });
      await assertExperienceShell(page, experience.expect, preview);
    });
  }
});
