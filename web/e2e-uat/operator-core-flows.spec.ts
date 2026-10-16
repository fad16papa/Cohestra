import { expect, test, type Page } from "@playwright/test";

/**
 * Story 19.5 operator walks.
 *
 * UAT_AUTO_BASIC_* / UAT_AUTO_PRO_* are Environment `uat` aliases for
 * EXISTING isolated UAT TenantAdmins. They are not a requirement to
 * provision new users or mailboxes.
 *
 * Canonical 19.5 login is email/password on the tenant host.
 * Signup OTP (Epic 45.5 / Story 19.3) is out of scope here.
 */

const basicEmail = process.env.UAT_AUTO_BASIC_EMAIL ?? "";
const basicPassword = process.env.UAT_AUTO_BASIC_PASSWORD ?? "";
const proEmail = process.env.UAT_AUTO_PRO_EMAIL ?? "";
const proPassword = process.env.UAT_AUTO_PRO_PASSWORD ?? "";

const basicSlug = process.env.UAT_AUTO_BASIC_SLUG?.trim() || "default";
const proSlug = process.env.UAT_AUTO_PRO_SLUG?.trim() || "creativorare";

function workspaceOrigin(slug: string): string {
  const base = process.env.UAT_PUBLIC_BASE_URL ?? "";
  if (!base) {
    throw new Error("UAT_PUBLIC_BASE_URL is required");
  }
  const url = new URL(base);
  if (!url.hostname.startsWith(`${slug}.`)) {
    url.hostname = `${slug}.${url.hostname}`;
  }
  return url.origin;
}

async function loginOnWorkspace(
  page: Page,
  origin: string,
  email: string,
  password: string,
) {
  const response = await page.goto(`${origin}/login`, {
    waitUntil: "domcontentloaded",
  });
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
      "UAT_AUTO_BASIC_EMAIL/PASSWORD are not mapped",
    );
    const origin = workspaceOrigin(basicSlug);
    await loginOnWorkspace(page, origin, basicEmail, basicPassword);
    await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main, [role='main']").first()).toBeVisible();
  });

  test("Basic activities room loads", async ({ page }) => {
    test.skip(
      !basicEmail || !basicPassword,
      "UAT_AUTO_BASIC_EMAIL/PASSWORD are not mapped",
    );
    const origin = workspaceOrigin(basicSlug);
    await loginOnWorkspace(page, origin, basicEmail, basicPassword);
    await page.goto(`${origin}/activities`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.locator("main, [role='main']").first()).toBeVisible();
  });

  test("Pro analytics room loads", async ({ page }) => {
    test.skip(
      !proEmail || !proPassword,
      "UAT_AUTO_PRO_EMAIL/PASSWORD are not mapped",
    );
    const origin = workspaceOrigin(proSlug);
    await loginOnWorkspace(page, origin, proEmail, proPassword);
    await page.goto(`${origin}/analytics`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.locator("main, [role='main']").first()).toBeVisible();
  });
});
