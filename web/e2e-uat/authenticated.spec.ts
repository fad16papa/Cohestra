import { expect, test } from "@playwright/test";

const email = process.env.UAT_AUTO_BASIC_EMAIL ?? "";
const password = process.env.UAT_AUTO_BASIC_PASSWORD ?? "";

test.describe("45.4 authenticated UAT", () => {
  test("dedicated automation login when credentials exist", async ({ page }) => {
    test.skip(!email || !password, "dedicated UAT automation credentials are not configured");
    const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign in|log in|continue/i }).click();
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 20_000 });
  });
});
