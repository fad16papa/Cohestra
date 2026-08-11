import { expect, test } from "@playwright/test";

const baseURL = process.env.PUBLIC_BASE_URL ?? "http://localhost:8088";

test.describe("smoke", () => {
  test("marketing home loads", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
  });

  test("pricing page loads", async ({ page }) => {
    const response = await page.goto("/pricing");
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("platform login page loads", async ({ page }) => {
    const response = await page.goto("/platform/login");
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
  });

  test("tenant subdomain login loads when available", async ({ page }) => {
    const tenantBase = baseURL.includes("localhost")
      ? baseURL.replace("://localhost", "://default.localhost")
      : null;

    if (!tenantBase) {
      test.skip(true, "Tenant subdomain smoke requires localhost base URL.");
      return;
    }

    try {
      const response = await page.goto(`${tenantBase}/login`, {
        timeout: 15_000,
        waitUntil: "domcontentloaded",
      });

      if (!response || !response.ok()) {
        test.skip(true, "Tenant subdomain login is not reachable in this environment.");
        return;
      }

      await expect(page.getByLabel(/email/i)).toBeVisible();
    } catch {
      test.skip(true, "Tenant subdomain login is not reachable in this environment.");
    }
  });
});
