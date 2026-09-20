import { expect, test } from "@playwright/test";

import {
  findActivityIdBySlug,
  loginOperatorSession,
  openActivityTab,
  selectExperienceLayoutLabel,
} from "./helpers/registration-e2e-api";

const DRAFT_SLUG = "demo-runners-draft-clinic";

async function selectVisibleRadioCard(page: import("@playwright/test").Page, label: RegExp) {
  const card = page.locator("label").filter({ hasText: label }).first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.click();
}

test.describe("Story 36.5 — design tokens and Modern Centered style", () => {
  test("Modern vs Minimal updates preview shell data attribute", async ({
    page,
    request,
  }) => {
    const session = await loginOperatorSession(request);
    const activityId = await findActivityIdBySlug(request, session.accessToken, DRAFT_SLUG);
    await openActivityTab(page, activityId, "design", session);
    await selectExperienceLayoutLabel(page, /Modern Centered/i);

    const previewShell = page.locator('[data-registration-shell="modern-centered"]');
    await expect(previewShell).toBeVisible({ timeout: 30_000 });

    await selectVisibleRadioCard(page, /^Modern$/i);
    await expect(previewShell).toHaveAttribute("data-registration-style", "modern");

    await selectVisibleRadioCard(page, /^Minimal$/i);
    await expect(previewShell).toHaveAttribute("data-registration-style", "minimal");
  });

  test("Compact typography token applies tighter form spacing", async ({ page, request }) => {
    const session = await loginOperatorSession(request);
    const activityId = await findActivityIdBySlug(request, session.accessToken, DRAFT_SLUG);
    await openActivityTab(page, activityId, "design", session);
    await selectExperienceLayoutLabel(page, /Modern Centered/i);

    await page.getByText("Typography scale").scrollIntoViewIfNeeded();
    await selectVisibleRadioCard(page, /^Compact$/i);

    const form = page.locator('[data-registration-shell="modern-centered"] form').first();
    await expect(form).toBeVisible({ timeout: 30_000 });
    await expect(form).toHaveClass(/space-y-3\.5/);
  });
});
