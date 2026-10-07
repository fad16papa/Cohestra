import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  PX2_BASIC_TENANT,
  PX2_CORE_TENANT,
  PX2_PRO_MEMBER,
  loginOwnedTenant,
} from "./helpers/e2e-owned-fixtures";
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
    await expect(page.getByText(/Plan:\s*(Pro|Core|Enterprise|Basic)/i)).toBeVisible();
    await expect(page.getByText(/workspace paused/i)).toHaveCount(0);
    await expect(page.getByText(/sandbox test card|transaction\.completed/i)).toHaveCount(0);
    expect(syncUrls).toEqual([]);
    const unavailable = page.getByText(/Billing isn't configured in this environment/i);
    const refresh = page.getByRole("button", { name: /refresh billing status/i });
    await expect(refresh).toBeVisible();
    if (await unavailable.count()) {
      await expect(unavailable).toBeVisible();
    }
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-billing-owner-1440.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthed(page, session, "/settings/billing");
    const refresh390 = page.getByRole("button", { name: /refresh billing status/i });
    await expect(refresh390).toBeVisible();
    const box = await refresh390.boundingBox();
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
    await expect(page.getByText(/Plan:\s*Basic/i)).toBeVisible();
    await expect(page.getByText(/workspace paused|you don't have permission/i)).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-billing-basic-1440.png"),
      fullPage: true,
    });

    await openAuthed(
      page,
      basicSession,
      "/settings/billing?billing=incomplete",
      tenantWebOrigin(PX2_BASIC_TENANT.slug)
    );
    await expect(page.getByText(/checkout has not activated a paid plan yet/i)).toBeVisible();
    await expect(page.getByText(/sandbox test card|4242|transaction\.completed/i)).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-billing-incomplete-1440.png"),
      fullPage: true,
    });

    try {
      const coreSession = await loginOwnedTenant(request, PX2_CORE_TENANT);
      await openAuthed(page, coreSession, "/settings/billing", tenantWebOrigin(PX2_CORE_TENANT.slug));
      await expect(page.getByText(/Plan:\s*Core/i)).toBeVisible();
      await expect(page.getByText(/workspace paused/i)).toHaveCount(0);
      await page.screenshot({
        path: path.join(evidenceDir, "viewports", "settings-billing-core-1440.png"),
        fullPage: true,
      });
    } catch (error) {
      test.info().annotations.push({
        type: "note",
        description: `Core fixture unavailable: ${String(error)}`,
      });
    }
  });

  test("injected Trialing, PastDue, OnHold, and non-owner Admin stay distinct", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(90_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);

    async function fulfillShell(
      patch: (raw: Record<string, unknown>) => void
    ): Promise<void> {
      await page.unroute("**/api/v1/admin/shell**").catch(() => undefined);
      await page.route("**/api/v1/admin/shell**", async (route) => {
        const response = await route.fetch();
        const raw = (await response.json()) as Record<string, unknown>;
        patch(raw);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(raw),
        });
      });
    }

    const trialEnd = new Date(Date.now() + 3 * 86_400_000).toISOString();
    await fulfillShell((raw) => {
      raw.billingStatus = "Trialing";
      raw.BillingStatus = "Trialing";
      raw.trialEndsAt = trialEnd;
      raw.TrialEndsAt = trialEnd;
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/settings/billing");
    const billingRegion = page.getByRole("region", { name: "Billing" });
    await expect(billingRegion.getByText(/Trial — \d+ days left/i)).toBeVisible();
    await expect(billingRegion.getByRole("alert")).toHaveCount(0);
    await expect(page.getByText(/workspace paused/i)).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-billing-trialing-1440.png"),
      fullPage: true,
    });

    await fulfillShell((raw) => {
      raw.billingStatus = "PastDue";
      raw.BillingStatus = "PastDue";
      raw.trialEndsAt = null;
      raw.TrialEndsAt = null;
    });
    await openAuthed(page, session, "/settings/billing");
    await expect(billingRegion.getByText(/Payment is past due/i)).toBeVisible();
    await expect(billingRegion.getByRole("alert").filter({ hasText: /payment method/i })).toBeVisible();
    await expect(page.getByText(/workspace paused/i)).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-billing-past-due-1440.png"),
      fullPage: true,
    });

    await fulfillShell((raw) => {
      raw.billingStatus = "OnHold";
      raw.BillingStatus = "OnHold";
      raw.trialEndsAt = null;
      raw.TrialEndsAt = null;
    });
    await openAuthed(page, session, "/settings/billing");
    await expect(billingRegion.getByText(/Billing is on hold/i)).toBeVisible();
    await expect(billingRegion.getByText(/read-only/i)).toBeVisible();
    await expect(billingRegion.getByText(/Trial —/i)).toHaveCount(0);
    await expect(page.getByText(/workspace paused/i)).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-billing-on-hold-1440.png"),
      fullPage: true,
    });

    await fulfillShell((raw) => {
      raw.isBillingOwner = false;
      raw.IsBillingOwner = false;
      raw.isTenantAdmin = true;
      raw.IsTenantAdmin = true;
      raw.billingOwnerEmail = "owner@cohestra.local";
      raw.BillingOwnerEmail = "owner@cohestra.local";
    });
    await openAuthed(page, session, "/settings/billing");
    await expect(page.getByText(/managed by/i)).toBeVisible();
    await expect(page.getByText("owner@cohestra.local")).toBeVisible();
    await expect(page.getByRole("button", { name: /refresh billing status/i })).toHaveCount(0);
    await expect(page.getByText(/you don't have permission/i)).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "settings-billing-non-owner-1440.png"),
      fullPage: true,
    });
    await page.unroute("**/api/v1/admin/shell**").catch(() => undefined);
  });
});
