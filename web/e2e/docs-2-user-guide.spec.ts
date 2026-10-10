import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

test.describe("Documentation 2.0", () => {
  test("loads chapters, images, search, and legacy anchors", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto("/docs", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { level: 1, name: /how to use cohestra/i })).toBeVisible();
    await expect(page.locator("#follow-up")).toBeVisible();
    await expect(page.locator("#reports")).toBeVisible();
    await expect(page.locator("#cohestra-ai")).toBeVisible();
    await expect(page.getByText(/Walk the club before you sign up/i)).toHaveCount(0);
    await expect(page.getByText(/Platform Admin/i)).toHaveCount(0);

    const images = page.locator("article img");
    await expect(images.first()).toBeVisible();
    const count = await images.count();
    expect(count).toBeGreaterThanOrEqual(15);
    for (let index = 0; index < count; index += 1) {
      await expect(images.nth(index)).toHaveJSProperty("naturalWidth", expect.any(Number));
      const width = await images.nth(index).evaluate((node) => (node as HTMLImageElement).naturalWidth);
      expect(width).toBeGreaterThan(0);
    }

    const fullPageAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const fullSerious = fullPageAxe.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical"
    );
    expect(fullSerious, JSON.stringify(fullSerious, null, 2)).toEqual([]);

    await page.goto("/docs#reports", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#reports")).toBeVisible();

    await page.getByRole("searchbox", { name: /search the document/i }).fill("Follow-up");
    await expect(page.getByRole("heading", { name: "Follow-up" })).toBeVisible();
    await page.getByRole("searchbox", { name: /search the document/i }).fill("xyzzy-no-match");
    await expect(page.getByText(/no chapters match/i)).toBeVisible();
  });

  test("lightbox keyboard close and responsive overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/docs", { waitUntil: "domcontentloaded" });
    const trigger = page.getByRole("button", { name: /enlarge screenshot/i }).first();
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: "Close" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/docs", { waitUntil: "domcontentloaded" });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow, viewport.name).toBeLessThanOrEqual(1);
    }
  });
});
