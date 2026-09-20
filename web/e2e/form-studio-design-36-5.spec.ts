import { expect, test } from "@playwright/test";

import {
  findActivityIdBySlug,
  loginOperatorSession,
  openActivityTab,
} from "./helpers/registration-e2e-api";

const DRAFT_SLUG = "demo-runners-draft-clinic";

test.describe("Story 36.5 — design tokens and Modern Centered style", () => {
  test("Modern vs Minimal updates preview shell data attribute", async ({
    page,
    request,
  }) => {
    const session = await loginOperatorSession(request);
    const activityId = await findActivityIdBySlug(request, session.accessToken, DRAFT_SLUG);
    await openActivityTab(page, activityId, "design", session);

    const previewShell = page.locator('[data-registration-shell="modern-centered"]');
    await expect(previewShell).toBeVisible({ timeout: 30_000 });

    await page.getByRole("radio", { name: /^Modern$/i }).first().check();
    await expect(previewShell).toHaveAttribute("data-registration-style", "modern");

    await page.getByRole("radio", { name: /^Minimal$/i }).first().check();
    await expect(previewShell).toHaveAttribute("data-registration-style", "minimal");
  });

  test("Compact typography token applies tighter form spacing", async ({ page, request }) => {
    const session = await loginOperatorSession(request);
    const activityId = await findActivityIdBySlug(request, session.accessToken, DRAFT_SLUG);
    await openActivityTab(page, activityId, "design", session);

    await page.getByRole("radio", { name: /^Compact$/i }).check();

    const form = page
      .locator('[data-registration-shell="modern-centered"] form')
      .first();
    await expect(form).toBeVisible({ timeout: 30_000 });
    await expect(form).toHaveClass(/space-y-3\.5/);
  });
});
