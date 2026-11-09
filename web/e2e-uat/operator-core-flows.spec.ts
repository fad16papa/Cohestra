import { expect, test, type Page } from "@playwright/test";

import { resolveUatWorkspaceOrigin } from "../lib/uat-workspace-origin";
import { requireConfiguredQaSlug } from "../lib/uat-qa-tenant";
import { assertLiveQaSession } from "./qa-session";

/**
 * Basic-beta operator walks on cohestra-qa-basic.
 *
 * UAT_AUTO_BASIC_SLUG must be that slug. Acceptance does not fall back to
 * the marketing apex or another organization. After login, the public door
 * and /api/v1/admin/shell must show that workspace, the Basic plan, and an
 * active door. Pro live coverage is not part of this job.
 *
 * Canonical login is email/password on the tenant host.
 */

const basicEmail = process.env.UAT_AUTO_BASIC_EMAIL ?? "";
const basicPassword = process.env.UAT_AUTO_BASIC_PASSWORD ?? "";

function workspaceOrigin(slug: string): string {
  const base = process.env.UAT_PUBLIC_BASE_URL ?? "";
  if (!base) {
    throw new Error("UAT_PUBLIC_BASE_URL is required");
  }
  return resolveUatWorkspaceOrigin(base, slug);
}

function isSettledWorkspaceUrl(url: URL): boolean {
  const path = url.pathname;
  const onWorkspace =
    path === "/dashboard"
    || path.startsWith("/dashboard/")
    || path === "/platform"
    || path.startsWith("/platform/");
  return onWorkspace && !url.searchParams.has("handoff");
}

async function loginBasic(page: Page): Promise<string> {
  const slug = requireConfiguredQaSlug("basic", process.env.UAT_AUTO_BASIC_SLUG);
  if (!basicEmail || !basicPassword) {
    throw new Error(
      "UAT_AUTO_BASIC_EMAIL/PASSWORD are required; authenticated coverage cannot skip",
    );
  }

  const base = process.env.UAT_PUBLIC_BASE_URL ?? "";
  const response = await page.goto(`${workspaceOrigin(slug)}/login`, {
    waitUntil: "networkidle",
  });
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  const submit = page.getByRole("button", { name: /sign in to workspace/i });
  await expect(submit).toBeEnabled();
  await page.locator("form").evaluate((form) => {
    form.setAttribute("method", "post");
  });
  await page.locator("#email").fill(basicEmail);
  await page.locator("#password").fill(basicPassword);
  await submit.click();
  await page.waitForURL(isSettledWorkspaceUrl, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Sign in" })).toHaveCount(0);
  await expect(page.locator("main, [role='main']").first()).toBeVisible();
  const origin = new URL(page.url()).origin;
  await assertLiveQaSession(page, {
    role: "basic",
    base,
    configuredSlug: slug,
    sessionOrigin: origin,
  });
  return origin;
}

test.describe("19.5 operator core flows", () => {
  test("Basic dashboard metrics load", async ({ page }) => {
    const origin = await loginBasic(page);
    await page.goto(`${origin}/dashboard`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("Basic activities room loads", async ({ page }) => {
    const origin = await loginBasic(page);
    await page.goto(`${origin}/activities`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { level: 1, name: "Activities" })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("Basic website is Core-locked and public stub home loads", async ({ page }) => {
    const origin = await loginBasic(page);
    await page.goto(`${origin}/dashboard/website`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { name: /unlock a branded public homepage/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator("#website-builder-toolbar")).toHaveCount(0);

    const home = await page.request.get(`${origin}/`);
    expect(home.ok()).toBeTruthy();
  });

  test("Basic campaigns room is Pro-locked", async ({ page }) => {
    const origin = await loginBasic(page);
    await page.goto(`${origin}/campaigns`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { name: /email campaigns are a pro craft/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});
