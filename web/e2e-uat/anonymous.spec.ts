import { expect, test } from "@playwright/test";

test.describe("45.4 anonymous UAT", () => {
  test("public /ready is Healthy", async ({ request }) => {
    const response = await request.get("/ready");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body.replace(/\s+/g, "")).toContain('"status":"Healthy"');
  });

  test("marketing home loads", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("signup page loads", async ({ page }) => {
    const response = await page.goto("/signup", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
  });

  test("login page loads without owner credentials", async ({ page }) => {
    const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});
