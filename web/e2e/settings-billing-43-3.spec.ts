import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { PX2_BASIC_TENANT, PX2_PRO_MEMBER, loginOwnedTenant } from "./helpers/e2e-owned-fixtures";
import { tenantWebOrigin } from "./helpers/owned-fixture-data";
import {
  loginOperatorSession,
  seedOperatorAuthSession,
  tenantWebBase,
  waitForOperatorWorkspace,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-43-3"
);

async function openAuthed(
  page: Page,
  session: Awaited<ReturnType<typeof loginOperatorSession>>,
  route: string,
  origin = tenantWebBase()
): Promise<void> {
  await seedOperatorAuthSession(page, session);
  await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.evaluate((stored) => {
      localStorage.setItem("auth_session", JSON.stringify(stored));
    }, session);
    await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded" });
  }
  await waitForOperatorWorkspace(page);
}

test.describe("Story 43.3 — Billing presentation", () => {
  test("owner Billing, incomplete copy, 390, and no background sync", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(90_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);
    const syncUrls: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes("/api/v1/admin/billing/sync")) {
        syncUrls.push(req.url());
      }
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/settings/billing");
    await expect(page).toHaveURL(/\/settings\/billing(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Billing", level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByText(/workspace paused/i)).toHaveCount(0);
    await expect(page.getByText(/4242|transaction\.completed|Notifications/i)).toHaveCount(0);
    expect(syncUrls).toEqual([]);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-billing-owner-1440.png"),
      fullPage: true,
    });

    await openAuthed(page, session, "/settings/billing?billing=incomplete");
    await expect(page.getByText(/checkout has not activated a paid plan yet/i)).toBeVisible();
    await expect(page.getByText(/4242/)).toHaveCount(0);
    await expect(page.getByText(/Notifications/i)).toHaveCount(0);
    expect(syncUrls).toEqual([]);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-billing-incomplete-1440.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthed(page, session, "/settings/billing");
    const refresh = page.getByRole("button", { name: /refresh billing status/i });
    await expect(refresh).toBeVisible();
    const box = await refresh.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow).toBe(false);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-billing-owner-390.png"),
      fullPage: true,
    });
  });

  test("Member denied, Basic owner, and OnHold language stay distinct", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(90_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    let memberSession: Awaited<ReturnType<typeof loginOwnedTenant>>;
    try {
      memberSession = await loginOwnedTenant(request, PX2_PRO_MEMBER);
    } catch (error) {
      test.skip(true, `Member fixture unavailable: ${String(error)}`);
      return;
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, memberSession, "/settings/billing", tenantWebOrigin(PX2_PRO_MEMBER.slug));
    await expect(page).toHaveURL(/\/settings\/billing/);
    await expect(page.getByRole("heading", { name: /you don't have permission to manage billing/i })).toBeVisible();
    await expect(page.getByText(/tenant admins only/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /start .* trial/i })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-billing-member-denied-1440.png"),
      fullPage: true,
    });

    let basicSession: Awaited<ReturnType<typeof loginOwnedTenant>>;
    try {
      basicSession = await loginOwnedTenant(request, PX2_BASIC_TENANT);
    } catch (error) {
      test.skip(true, `Basic fixture unavailable: ${String(error)}`);
      return;
    }

    await openAuthed(page, basicSession, "/settings/billing", tenantWebOrigin(PX2_BASIC_TENANT.slug));
    await expect(page.getByRole("heading", { name: "Billing", level: 1 })).toBeVisible();
    await expect(page.getByText(/workspace paused/i)).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-billing-basic-1440.png"),
      fullPage: true,
    });
  });
});
