import { expect, test } from "@playwright/test";

import {
  findActivityIdBySlug,
  loginOperatorSession,
  openActivityTab,
} from "./helpers/registration-e2e-api";

const DRAFT_SLUG = "demo-runners-draft-clinic";

test.describe("Story 36.6 — Preview viewports", () => {
  test("Desktop / Tablet / Mobile switch without saving", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    const session = await loginOperatorSession(request);
    const activityId = await findActivityIdBySlug(request, session.accessToken, DRAFT_SLUG);
    await openActivityTab(page, activityId, "form", session);

    await page.locator("#form-studio-tab-preview").click();
    const preview = page.locator("#form-studio-preview-panel");
    const toggle = preview.getByRole("radiogroup", { name: /Preview viewport/i });
    await expect(toggle).toBeVisible({ timeout: 30_000 });
    await expect(toggle.getByRole("radio", { name: /^Mobile$/i })).toBeVisible();
    await expect(toggle.getByRole("radio", { name: /^Tablet$/i })).toBeVisible();
    await expect(toggle.getByRole("radio", { name: /^Desktop$/i })).toBeVisible();

    await toggle.locator("label").filter({ hasText: /^Tablet$/i }).click();
    await expect(preview.locator("[data-preview-viewport='tablet']")).toBeVisible();
    await expect(
      preview.locator("[data-preview-viewport='tablet'] .registration-preview-surface")
    ).toHaveClass(/max-w-\[768px\]/);

    await toggle.locator("label").filter({ hasText: /^Desktop$/i }).click();
    await expect(preview.locator("[data-preview-viewport='desktop']")).toBeVisible();

    await toggle.locator("label").filter({ hasText: /^Mobile$/i }).click();
    await expect(preview.locator("[data-preview-viewport='mobile']")).toBeVisible();
    await expect(
      preview.locator("[data-preview-viewport='mobile'] .registration-preview-surface")
    ).toHaveClass(/max-w-\[390px\]/);

    await page.getByRole("tab", { name: /^Form$/i }).click();
    await page.locator("#form-studio-tab-build").click();
    await expect(page.getByRole("listbox", { name: /Form blocks/i })).toBeVisible();
  });
});
