import { expect, test } from "@playwright/test";

import { provisionOwnedActivity } from "./helpers/e2e-owned-fixtures";
import { MARINA_LIKE_FORM_SCHEMA, SINGLE_PAGE_CENTERED_THEME } from "./helpers/owned-fixture-data";
import { loginOperatorSession, tenantWebBase } from "./helpers/registration-e2e-api";

const viewports = [
  { name: "mobile-narrow", width: 320, height: 720 },
  { name: "mobile", width: 375, height: 812 },
  { name: "mobile-large", width: 412, height: 915 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("public registration responsive", () => {
  test.describe.configure({ mode: "serial" });

  let slug: string;

  test.beforeAll(async ({ request }, testInfo) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    const session = await loginOperatorSession(request);
    const owned = await provisionOwnedActivity(request, session, {
      ownerKey: "38-3-responsive",
      workerIndex: testInfo.workerIndex,
      theme: SINGLE_PAGE_CENTERED_THEME,
      formSchema: MARINA_LIKE_FORM_SCHEMA,
      publish: true,
    });
    slug = owned.slug;
  });

  for (const viewport of viewports) {
    test(`register page layout at ${viewport.name} (${viewport.width}px)`, async ({
      page,
    }) => {
      test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      const response = await page.goto(`${tenantWebBase()}/register/${slug}`, {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      });

      expect(response?.ok(), "Owned registration page must load").toBeTruthy();
      await expect(page.getByText(/activity not found/i)).toHaveCount(0);

      const joinButton = page.getByRole("button", { name: /join activity/i });
      await expect(joinButton).toBeVisible({ timeout: 30_000 });
      await assertNoHorizontalOverflow(page);

      const box = await joinButton.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      }
    });
  }

  test("embed register respects narrow iframe width", async ({ page }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

    await page.setViewportSize({ width: 360, height: 800 });
    const response = await page.goto(`${tenantWebBase()}/embed/register/${slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });

    expect(response?.ok(), "Owned embed registration must load").toBeTruthy();
    await assertNoHorizontalOverflow(page);
  });
});
