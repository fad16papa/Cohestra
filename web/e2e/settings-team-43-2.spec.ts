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
  "../../_bmad-output/planning-artifacts/evidence/px2-43-2"
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

test.describe("Story 43.2 — Team and permissions", () => {
  test("Admin eligible Team, invite/revoke, remove dialog, 390, and 43.1 route", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/settings/team");
    await expect(page).toHaveURL(/\/settings\/team(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Team", level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Invite by email", level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: /add a second keyholder/i })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-team-admin-1440.png"),
      fullPage: true,
    });

    const inviteEmail = `qa-43-2-${Date.now()}@example.com`;
    await page.getByLabel("Email").fill(inviteEmail);
    await page.getByRole("button", { name: "Send invite" }).click();
    await expect(page.getByText(inviteEmail)).toBeVisible();

    const revokeButton = page
      .locator("li")
      .filter({ hasText: inviteEmail })
      .getByRole("button", { name: "Revoke" });
    await revokeButton.click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByRole("heading", { name: "Revoke invite?" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Revoke invite" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Yes" })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-team-revoke-dialog-1440.png"),
      fullPage: false,
    });
    await dialog.getByRole("button", { name: "Revoke invite" }).click();
    await expect(page.getByText(inviteEmail)).toHaveCount(0);

    const remove = page.getByRole("button", { name: "Remove" }).first();
    if (await remove.count()) {
      await remove.click();
      await expect(page.getByRole("alertdialog").getByRole("heading", { name: "Remove team member?" })).toBeVisible();
      await expect(page.getByRole("alertdialog").getByRole("button", { name: "Remove member" })).toBeVisible();
      await page.screenshot({
        path: path.join(evidenceDir, "viewports", "settings-team-remove-dialog-1440.png"),
        fullPage: false,
      });
      await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
    }

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page).toHaveURL(/\/settings\/team(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Team", level: 1 })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthed(page, session, "/settings/team");
    await expect(page.getByRole("heading", { name: "Team", level: 1 })).toBeVisible();
    const send = page.getByRole("button", { name: "Send invite" });
    await expect(send).toBeVisible();
    const sendBox = await send.boundingBox();
    expect(sendBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow).toBe(false);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-team-admin-390.png"),
      fullPage: true,
    });
  });

  test("Member denied is not an upgrade and Basic stays plan-locked", async ({ page, request }) => {
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
    await openAuthed(page, memberSession, "/settings/team", tenantWebOrigin(PX2_PRO_MEMBER.slug));
    await expect(page.getByRole("heading", { name: /you don't have permission to manage team/i })).toBeVisible();
    await expect(page.getByText(/tenant admins only/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /add a second keyholder/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /start .* trial/i })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-team-member-denied-1440.png"),
      fullPage: true,
    });

    let basicSession: Awaited<ReturnType<typeof loginOwnedTenant>>;
    try {
      basicSession = await loginOwnedTenant(request, PX2_BASIC_TENANT);
    } catch (error) {
      test.skip(true, `Basic fixture unavailable: ${String(error)}`);
      return;
    }

    await openAuthed(page, basicSession, "/settings/team", tenantWebOrigin(PX2_BASIC_TENANT.slug));
    await expect(page.getByRole("heading", { name: /add a second keyholder/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send invite" })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-team-basic-lock-1440.png"),
      fullPage: true,
    });
  });
});
