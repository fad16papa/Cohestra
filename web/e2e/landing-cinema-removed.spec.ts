import { expect, test } from "@playwright/test";

test.describe("landing Cinema section removed", () => {
  test("marketing home has no house tour and keeps remaining sections", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: /walk the club before you sign up/i })
    ).toHaveCount(0);
    await expect(page.getByText(/house tour through Harbourline/i)).toHaveCount(0);
    await expect(page.getByRole("tablist", { name: /club house tour/i })).toHaveCount(0);
    await expect(page.locator("#crm")).toHaveCount(0);

    await expect(
      page.getByRole("heading", {
        name: /know who registered, and who still needs a reply/i,
      })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /one workspace from registration to analytics/i,
      })
    ).toBeVisible();
    await expect(page.locator("#registration")).toBeAttached();
    await expect(page.locator("#follow-up")).toBeAttached();
    await expect(page.locator("#capabilities")).toBeAttached();
    await expect(page.getByText("Product preview").first()).toBeVisible();
    await expect(page.locator('img[src*="hero-community-sports"]')).toHaveCount(0);
    await expect(page.getByText(/under 1 hr/i)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Start free" }).first()).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator("#crm")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      768 + 1
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("#crm")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390 + 1
    );
  });
});
