import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  loginOperatorSession,
  seedOperatorAuthSession,
  tenantWebBase,
  waitForOperatorWorkspace,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-39-5"
);

const SECRET_LEAKS = [
  "e2e-forced-route-error",
  "digest",
  "at Object",
  "node_modules",
  "Bearer ",
];

async function openAuthed(
  page: Page,
  session: Awaited<ReturnType<typeof loginOperatorSession>>,
  route: string
): Promise<void> {
  await seedOperatorAuthSession(page, session);
  await page.goto(`${tenantWebBase()}${route}`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.evaluate((stored) => {
      localStorage.setItem("auth_session", JSON.stringify(stored));
    }, session);
    await page.goto(`${tenantWebBase()}${route}`, { waitUntil: "domcontentloaded" });
  }
}

async function assertNoOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  expect(overflow, label).toBe(false);
}

async function assertNoSecrets(page: Page): Promise<void> {
  const text = (await page.locator("body").innerText()).toLowerCase();
  for (const leak of SECRET_LEAKS) {
    expect(text, leak).not.toContain(leak.toLowerCase());
  }
}

async function assertAuthenticatedAdminNotFound(page: Page, route: string): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(page.locator("[data-admin-shell]")).toHaveCount(1);
  await expect(page.getByRole("complementary", { name: "Workspace" })).toBeVisible();
  await expect(page.locator("#main-content").getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "href",
    "/dashboard"
  );
  expect(page.url(), route).not.toContain("/login");
  await expect(page.getByText("This page isn't in this workspace. Open Dashboard.")).toBeVisible();
}

test.describe("Story 39.5 — route error and not-found", () => {
  test.describe.configure({ mode: "serial" });
  test("404, crash, offline, focus, landmarks, and evidence", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const session = await loginOperatorSession(request);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/nope-px2-39-5", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    const home = page.getByRole("link", { name: "Home" });
    await expect(home).toHaveAttribute("href", "/");
    const homeBox = await home.boundingBox();
    expect(homeBox?.width, "marketing Home width").toBeGreaterThanOrEqual(48);
    expect(homeBox?.height, "marketing Home height").toBeGreaterThanOrEqual(48);
    await page.waitForFunction(() => document.activeElement?.tagName === "H1");
    await assertNoSecrets(page);
    await assertNoOverflow(page, "marketing 404 1440");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "marketing-404-1440.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoOverflow(page, "marketing 404 390");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "marketing-404-390.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/dashboard/nope-px2-39-5");
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.locator("#main-content").getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard"
    );
    await page.waitForFunction(() => document.activeElement?.tagName === "H1");
    await assertNoSecrets(page);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "admin-404-1440.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoOverflow(page, "admin 404 390");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "admin-404-390.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("http://localhost:3000/platform/nope-px2-39-5", {
      waitUntil: "domcontentloaded",
    });
    const platformHeading = page.getByRole("heading", { level: 1, name: "Page not found" });
    const platformLogin = page.getByRole("heading", { name: /platform admin sign in/i });
    const platformLoading = page.getByText(/Loading platform console/i);
    await expect(platformHeading.or(platformLogin).or(platformLoading)).toBeVisible({
      timeout: 15_000,
    });
    if (await platformHeading.isVisible().catch(() => false)) {
      await expect(page.getByRole("link", { name: "Platform home" })).toHaveAttribute(
        "href",
        "/platform"
      );
    }
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "platform-404.png"),
      fullPage: true,
    });

    await openAuthed(page, session, "/dashboard/e2e-force-error");
    await waitForOperatorWorkspace(page);
    await page.getByTestId("e2e-force-error-trigger").click();
    await expect(page.getByRole("heading", { level: 1, name: "This screen failed" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await assertNoSecrets(page);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "admin-error-1440.png"),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "focused-h1-1440.png"),
    });

    await page.context().setOffline(true);
    await page.waitForFunction(() => navigator.onLine === false);
    await expect(page.getByRole("heading", { level: 1, name: "You're offline" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText("You're offline. We'll retry when the connection returns.")
    ).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "offline-1440.png"),
      fullPage: true,
    });
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await page.context().setOffline(false);
    await expect(page.getByTestId("e2e-force-error-trigger")).toBeVisible({ timeout: 15_000 });

    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/nope-px2-39-5", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "marketing-404-dark-1440.png"),
      fullPage: true,
    });
    await page.emulateMedia({ forcedColors: "active" });
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "marketing-404-forced-colors-1440.png"),
      fullPage: true,
    });
  });

  test("unmatched admin descendants stay inside the authenticated shell", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    const session = await loginOperatorSession(request);
    const probes = [
      "/clients/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee/extra",
      "/activities/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee/extra",
      "/campaigns/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee/extra",
      "/billing/checkout/extra",
      "/reports/extra",
    ] as const;

    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of probes) {
      await openAuthed(page, session, route);
      await waitForOperatorWorkspace(page);
      await assertAuthenticatedAdminNotFound(page, route);
      await assertNoSecrets(page);
    }

    await openAuthed(page, session, "/clients");
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { level: 1, name: "Clients" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toHaveCount(0);
  });
});
