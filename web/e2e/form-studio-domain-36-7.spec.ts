import { expect, test } from "@playwright/test";

import {
  findActivityIdBySlug,
  loginOperatorSession,
  openActivityTab,
} from "./helpers/registration-e2e-api";

const DRAFT_SLUG = "demo-runners-draft-clinic";

test.describe("Story 36.7 — domain blocks", () => {
  test("adds Activity domain blocks and previews live Activity data", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    const session = await loginOperatorSession(request);
    const activityId = await findActivityIdBySlug(request, session.accessToken, DRAFT_SLUG);
    await openActivityTab(page, activityId, "form", session);

    await page.locator("#form-studio-tab-build").click();
    await expect(page.getByRole("listbox", { name: /Form blocks/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: /^Activity details$/i }).click();
    await page.getByRole("button", { name: /^Capacity$/i }).click();
    await page.getByRole("button", { name: /^Community identity$/i }).click();

    await expect(
      page.getByRole("option", { name: /Activity details/i }).first()
    ).toBeVisible();
    await expect(page.getByText(/Connected to this Activity/i).first()).toBeVisible();
    await expect(
      page.getByText(/This block stays connected to live Activity/i)
    ).toBeVisible();

    await page.locator("#form-studio-tab-preview").click();
    const preview = page.locator("#form-studio-preview-panel");
    await expect(preview.locator("[data-domain-block='activityDetails']")).toBeVisible({
      timeout: 30_000,
    });
    await expect(preview.locator("[data-domain-block='communityIdentity']")).toBeVisible();

    const toggle = preview.getByRole("radiogroup", { name: /Preview viewport/i });
    await toggle.locator("label").filter({ hasText: /^Tablet$/i }).click();
    await expect(preview.locator("[data-preview-viewport='tablet']")).toBeVisible();
    await expect(
      preview.locator("[data-preview-viewport='tablet'] [data-domain-block='activityDetails']")
    ).toBeVisible();

    await toggle.locator("label").filter({ hasText: /^Mobile$/i }).click();
    await expect(
      preview.locator("[data-preview-viewport='mobile'] [data-domain-block='activityDetails']")
    ).toBeVisible();
  });
});
