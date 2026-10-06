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
  "../../_bmad-output/planning-artifacts/evidence/px2-43-1"
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

function settingsRail(page: Page) {
  return page.locator("aside[aria-label='Settings sections']");
}

test.describe("Story 43.1 — Settings nested routes", () => {
  test("canonical routes, legacy search, history, landmarks, and 1024 rail", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/settings");
    await expect(page).toHaveURL(/\/settings\/plan(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Plan & limits", level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(settingsRail(page).getByRole("link", { name: "Plan & limits" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-plan-1440.png"),
      fullPage: true,
    });

    await openAuthed(page, session, "/settings/appearance");
    await expect(page.getByRole("heading", { name: "Appearance", level: 1 })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page).toHaveURL(/\/settings\/appearance(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Appearance", level: 1 })).toBeVisible();

    await openAuthed(page, session, "/settings?section=team");
    await expect(page).toHaveURL(/\/settings\/team(?:\?|$)/);
    await expect(page).not.toHaveURL(/section=/);
    await expect(page.getByRole("heading", { name: "Team", level: 1 })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-team-1440.png"),
      fullPage: true,
    });

    await openAuthed(page, session, "/settings?section=account");
    await expect(page).toHaveURL(/\/settings\/profile(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Your account", level: 1 })).toBeVisible();

    await openAuthed(page, session, "/settings?activeId=appearance");
    await expect(page).toHaveURL(/\/settings\/appearance(?:\?|$)/);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-appearance-1440.png"),
      fullPage: true,
    });

    await openAuthed(page, session, "/settings?section=billing");
    await expect(page).toHaveURL(/\/settings\/billing(?:\?|$)/);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-billing-1440.png"),
      fullPage: true,
    });

    await openAuthed(page, session, "/settings/profile");
    await settingsRail(page).getByRole("link", { name: "Team", exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/team(?:\?|$)/);
    await settingsRail(page).getByRole("link", { name: "Billing", exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/billing(?:\?|$)/);
    await page.goBack();
    await expect(page).toHaveURL(/\/settings\/team(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Team", level: 1 })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/settings\/profile(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Your account", level: 1 })).toBeVisible();

    await openAuthed(page, session, "/settings/teem");
    await expect(page.getByRole("heading", { name: "Page not found", level: 1 })).toBeVisible();

    const sidebar = page.getByRole("complementary", { name: "Workspace" });
    await expect(sidebar.getByRole("link", { name: "Settings", exact: true })).toHaveAttribute(
      "href",
      "/settings"
    );

    await page.setViewportSize({ width: 1024, height: 768 });
    await openAuthed(page, session, "/settings/plan");
    await expect(settingsRail(page)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Plan & limits", level: 1 })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-plan-1024.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 768, height: 1024 });
    await openAuthed(page, session, "/settings/team");
    await expect(page.getByRole("navigation", { name: "Settings sections" }).locator("visible=true")).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-team-768.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthed(page, session, "/settings/profile");
    await expect(page.getByRole("heading", { name: "Your account", level: 1 })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-profile-390.png"),
      fullPage: true,
    });
    await openAuthed(page, session, "/settings/appearance");
    const chips = page.getByRole("navigation", { name: "Settings sections" }).locator("visible=true");
    await expect(chips.getByRole("link", { name: "Appearance" })).toBeVisible();
    const appearanceChip = await chips.getByRole("link", { name: "Appearance" }).boundingBox();
    expect(appearanceChip?.height ?? 0).toBeGreaterThanOrEqual(44);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow).toBe(false);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-appearance-390.png"),
      fullPage: true,
    });

    await page.emulateMedia({ reducedMotion: "reduce" });
    await chips.getByRole("link", { name: "Your account" }).click();
    await expect(page.getByRole("heading", { name: "Your account", level: 1 })).toBeVisible();
  });

  test("Member personal routes pass and admin-only routes keep current deny contracts", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(90_000);
    let session: Awaited<ReturnType<typeof loginOwnedTenant>>;
    try {
      session = await loginOwnedTenant(request, PX2_PRO_MEMBER);
    } catch (error) {
      test.skip(true, `Member fixture unavailable: ${String(error)}`);
      return;
    }
    const origin = tenantWebOrigin(PX2_PRO_MEMBER.slug);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/settings", origin);
    await expect(page).toHaveURL(/\/settings\/profile(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Your account", level: 1 })).toBeVisible();
    await expect(settingsRail(page).getByRole("link", { name: "Team" })).toHaveCount(0);
    await expect(settingsRail(page).getByRole("link", { name: "Plan & limits" })).toHaveCount(0);

    await openAuthed(page, session, "/settings/team", origin);
    await expect(page.getByText(/tenant admins only/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /start .* trial/i })).toHaveCount(0);

    await openAuthed(page, session, "/settings/billing", origin);
    await expect(page.getByText(/Billing settings are available to tenant admins only/i)).toBeVisible();
    await expect(page).toHaveURL(/\/settings\/billing(?:\?|$)/);

    await openAuthed(page, session, "/settings/plan", origin);
    await expect(page).toHaveURL(/\/settings\/profile(?:\?|$)/);
  });

  test("Basic Team UpgradePanel is preserved on the nested team route", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(60_000);
    let session: Awaited<ReturnType<typeof loginOwnedTenant>>;
    try {
      session = await loginOwnedTenant(request, PX2_BASIC_TENANT);
    } catch (error) {
      test.skip(true, `Basic fixture unavailable: ${String(error)}`);
      return;
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/settings/team", tenantWebOrigin(PX2_BASIC_TENANT.slug));
    await expect(page.getByRole("heading", { name: /add a second keyholder/i })).toBeVisible();
  });
});
