import { expect, test } from "@playwright/test";

const registrationSlug =
  process.env.REGISTRATION_E2E_SLUG ?? "demo-marina-social-meetup";

function resolveRegistrationBaseUrl(): string | null {
  const configured = process.env.PUBLIC_BASE_URL ?? "http://localhost:8088";
  if (configured.includes("localhost") && !configured.includes(".localhost")) {
    return configured.replace("://localhost", "://default.localhost");
  }
  return configured;
}

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
  for (const viewport of viewports) {
    test(`register page layout at ${viewport.name} (${viewport.width}px)`, async ({
      page,
    }) => {
      const baseURL = resolveRegistrationBaseUrl();
      if (!baseURL) {
        test.skip(true, "Registration base URL not configured.");
        return;
      }

      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      const response = await page.goto(`${baseURL}/register/${registrationSlug}`, {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      });

      if (!response?.ok()) {
        test.skip(true, "Registration page not available in this environment.");
        return;
      }

      const joinButton = page.getByRole("button", { name: /join activity/i });
      const notFound = page.getByText(/activity not found/i);

      if (await notFound.isVisible().catch(() => false)) {
        test.skip(true, "Demo registration activity not found for tenant host.");
        return;
      }

      if (!(await joinButton.isVisible().catch(() => false))) {
        test.skip(true, "Registration form not open in this environment.");
        return;
      }
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
    const baseURL = resolveRegistrationBaseUrl();
    if (!baseURL) {
      test.skip(true, "Registration base URL not configured.");
      return;
    }

    await page.setViewportSize({ width: 360, height: 800 });
    const response = await page.goto(`${baseURL}/embed/register/${registrationSlug}`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });

    if (!response?.ok()) {
      test.skip(true, "Embed registration not available.");
      return;
    }

    await assertNoHorizontalOverflow(page);
  });
});
