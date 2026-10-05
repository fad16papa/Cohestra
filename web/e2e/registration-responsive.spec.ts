import { expect, test } from "@playwright/test";

import { provisionOwnedActivity } from "./helpers/e2e-owned-fixtures";
import {
  DEFAULT_TENANT_SLUG,
  MARINA_LIKE_FORM_SCHEMA,
  SINGLE_PAGE_CENTERED_THEME,
  resolveE2eApiBase,
  tenantApiHost,
} from "./helpers/owned-fixture-data";
import { loginOperatorSession, tenantWebBase } from "./helpers/registration-e2e-api";

const viewports = [
  { name: "mobile-narrow", width: 320, height: 720 },
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile", width: 375, height: 812 },
  { name: "mobile-large", width: 412, height: 915 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1366, height: 768 },
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

  test("embed register stays within a 320px iframe container", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(60_000);

    const session = await loginOperatorSession(request);
    const parentOrigin = tenantWebBase();
    const allow = await request.patch(
      `${resolveE2eApiBase()}/api/v1/admin/tenant/embed-settings`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Host: tenantApiHost(DEFAULT_TENANT_SLUG),
        },
        data: { allowedEmbedOrigins: [parentOrigin] },
      }
    );
    expect(allow.ok(), await allow.text()).toBeTruthy();

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.route("**/__embed-harness", async (route) => {
      await route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><iframe id="reg-embed" src="/embed/register/${slug}" width="320" height="720" style="border:0"></iframe>`,
      });
    });
    await page.goto(`${parentOrigin}/__embed-harness`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });

    const frame = page.frameLocator("#reg-embed");
    const joinButton = frame.getByRole("button", { name: /join activity/i });
    await expect(joinButton).toBeVisible({ timeout: 30_000 });

    const overflow = await page.locator("#reg-embed").evaluate((iframe) => {
      const doc = (iframe as HTMLIFrameElement).contentDocument?.documentElement;
      if (!doc) {
        return Number.POSITIVE_INFINITY;
      }
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("confirmation screen does not overflow at 375", async ({ page }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(60_000);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${tenantWebBase()}/register/${slug}`, {
      waitUntil: "networkidle",
      timeout: 20_000,
    });

    const stamp = Date.now().toString();
    await page.getByRole("textbox", { name: /full name/i }).fill("Responsive Check");
    await page.getByRole("textbox", { name: /phone/i }).fill(`9${stamp.slice(-7)}`);
    const email = page.getByRole("textbox", { name: /^email$/i });
    if (await email.isVisible().catch(() => false)) {
      await email.fill(`responsive-${stamp}@example.com`);
    }
    await page.getByRole("checkbox", { name: /agree|consent/i }).check();
    await page.getByRole("button", { name: /join activity/i }).click();
    await expect(
      page.getByRole("heading", { name: /you're registered/i })
    ).toBeVisible({ timeout: 30_000 });
    await assertNoHorizontalOverflow(page);
  });

  test("unavailable register page does not overflow at 320", async ({ page }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

    await page.setViewportSize({ width: 320, height: 720 });
    const response = await page.goto(
      `${tenantWebBase()}/register/missing-activity-slug-zz`,
      { waitUntil: "domcontentloaded", timeout: 20_000 }
    );
    expect(response?.ok() || response?.status() === 404).toBeTruthy();
    await expect(page.getByText(/public registration/i)).toBeVisible({
      timeout: 20_000,
    });
    await assertNoHorizontalOverflow(page);
  });
});
