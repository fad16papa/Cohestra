import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { resolveE2eApiBase } from "./helpers/owned-fixture-data";
import {
  loginOperatorSession,
  loginPlatformAdminSession,
  seedOperatorAuthSession,
  waitForPlatformConsole,
  type OperatorSession,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-43-4"
);
const API_BASE = resolveE2eApiBase();

async function openPlatform(
  page: Page,
  session: OperatorSession,
  route: string
): Promise<void> {
  await seedOperatorAuthSession(page, session);
  await page.goto(route, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.evaluate((stored) => {
      localStorage.setItem("auth_session", JSON.stringify(stored));
    }, session);
    await page.goto(route, { waitUntil: "domcontentloaded" });
  }
  await waitForPlatformConsole(page);
}

async function pageOverflows(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
}

async function createDisposableTenant(
  request: import("@playwright/test").APIRequestContext,
  token: string
): Promise<{ id: string; slug: string; name: string }> {
  const slug = `e2e43-${Date.now().toString(36)}`;
  const name = `E2E 43.4 ${slug}`;
  const response = await request.post(`${API_BASE}/api/v1/platform/tenants`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      slug,
      plan: "Basic",
      adminContactEmail: `${slug}@example.test`,
    },
  });
  if (!response.ok()) {
    throw new Error(`Create disposable tenant failed: ${response.status()} ${await response.text()}`);
  }
  const body = (await response.json()) as { id?: string; slug?: string; name?: string };
  if (!body.id || !body.slug || !body.name) {
    throw new Error("Create disposable tenant response missing id/slug/name");
  }
  return { id: body.id, slug: body.slug, name: body.name };
}

test.describe("Story 43.4 — Platform administration", () => {
  test("PlatformAdmin directory, skip, nav, 390, and denial", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(90_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const tenantSession = await loginOperatorSession(request);
    await seedOperatorAuthSession(page, tenantSession);
    await page.goto("/platform", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Tenant directory", level: 1 })).toHaveCount(0);

    const session = await loginPlatformAdminSession(request);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform");
    await expect(page.getByRole("heading", { name: "Tenant directory", level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Platform" }).getByRole("link", { name: "Tenants" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "platform-directory-1440.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, "/platform");
    await expect(page.getByRole("heading", { name: "Tenant directory", level: 1 })).toBeVisible();
    expect(await pageOverflows(page)).toBe(false);
    const menu = page.getByRole("button", { name: /open menu|close menu/i });
    const box = await menu.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "platform-directory-390.png"),
      fullPage: true,
    });
  });

  test("tenant detail, support, Archive dialog, Suspend language", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const session = await loginPlatformAdminSession(request);
    const disposable = await createDisposableTenant(request, session.accessToken);

    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, `/platform/tenants/${disposable.id}`);
    await expect(page.getByRole("heading", { name: disposable.slug, level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByText(/not for non-payment/i)).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "platform-tenant-1440.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Archive" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: `Archive ${disposable.slug}?` })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Archive workspace" })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "platform-archive-dialog.png"),
      fullPage: true,
    });
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Archive" })).toBeVisible();

    await page.getByRole("button", { name: "Suspend" }).click();
    const confirmSuspend = page.getByRole("button", { name: "Confirm suspend" });
    await expect(confirmSuspend).toBeDisabled();
    await page.locator("#suspend-reason").fill("E2E abuse freeze — not collections");
    await confirmSuspend.click();
    await expect(page.getByText(/Workspace paused\./).first()).toBeVisible();
    await expect(page.getByText(/Billing is on hold/i)).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "platform-suspend.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Reactivate" }).click();
    await expect(page.getByRole("button", { name: "Suspend" })).toBeVisible();

    await page.getByRole("button", { name: "Archive" }).click();
    await page.getByRole("button", { name: "Archive workspace" }).click();
    await expect(page.getByText(/Workspace archived\./).first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, `/platform/tenants/${disposable.id}`);
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "platform-tenant-390.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlatform(page, session, "/platform/support");
    await expect(page.getByRole("heading", { name: "Support inbox", level: 1 })).toHaveCount(1);
    await expect(
      page.getByRole("navigation", { name: "Platform" }).getByRole("link", { name: "Support" })
    ).toHaveAttribute("aria-current", "page");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "platform-support-1440.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await openPlatform(page, session, "/platform/support");
    expect(await pageOverflows(page)).toBe(false);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "platform-support-390.png"),
      fullPage: true,
    });
  });
});
