import { expect, test } from "@playwright/test";

test.describe("45.6 Layer A real UAT recaptcha", () => {
  test("does not solve a live Google challenge", async ({ page }) => {
    const response = await page.goto("/signup", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const widget = page.locator("iframe[src*='recaptcha']");
    const script = page.locator("script[src*='www.google.com/recaptcha']");
    const widgetCount = await widget.count();
    const scriptCount = await script.count();

    test.skip(
      widgetCount === 0 && scriptCount === 0,
      "Layer A waits for real UAT recaptcha keys (Story 19.3). Do not solve a live challenge.",
    );

    await expect(widget.first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/error for site owner|invalid site key/i)).toHaveCount(0);
  });
});
