import { expect, test, type Page } from "@playwright/test";

const basicEmail = process.env.UAT_AUTO_BASIC_EMAIL ?? "";
const basicPassword = process.env.UAT_AUTO_BASIC_PASSWORD ?? "";
const proEmail = process.env.UAT_AUTO_PRO_EMAIL ?? "";
const proPassword = process.env.UAT_AUTO_PRO_PASSWORD ?? "";

async function login(page: Page, email: string, password: string) {
  const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in|continue/i }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 20_000 });
  await expect(page.locator("main, [role='main']").first()).toBeVisible();
}

test.describe("19.5 operator core flows", () => {
  test("Basic dashboard metrics load", async ({ page }) => {
    test.skip(
      !basicEmail || !basicPassword,
      "dedicated UAT automation credentials are not configured",
    );
    await login(page, basicEmail, basicPassword);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main, [role='main']").first()).toBeVisible();
  });

  test("Basic activities room loads", async ({ page }) => {
    test.skip(
      !basicEmail || !basicPassword,
      "dedicated UAT automation credentials are not configured",
    );
    await login(page, basicEmail, basicPassword);
    await page.goto("/activities", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.locator("main, [role='main']").first()).toBeVisible();
  });

  test("Pro analytics room loads", async ({ page }) => {
    test.skip(
      !proEmail || !proPassword,
      "dedicated UAT Pro automation credentials are not configured",
    );
    await login(page, proEmail, proPassword);
    await page.goto("/analytics", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.locator("main, [role='main']").first()).toBeVisible();
  });
});
