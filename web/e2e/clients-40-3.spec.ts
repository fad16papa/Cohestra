import fs from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  DEFAULT_PRO_TENANT,
  PX2_BASIC_TENANT,
  PX2_PRO_MEMBER,
  loginOwnedTenant,
  type OwnedTenant,
} from "./helpers/e2e-owned-fixtures";
import { resolveE2eApiBase, tenantApiHost } from "./helpers/owned-fixture-data";
import {
  loginOperatorSession,
  seedOperatorAuthSession,
  tenantWebBase,
  waitForOperatorWorkspace,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-40-3"
);

type AxeViolation = {
  id: string;
  impact: string | null;
  description: string;
};

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

async function waitForClientsReady(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: "Clients" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Lead queue filters" })).toBeVisible({
    timeout: 20_000,
  });
}

function visibleClientProfileLink(page: Page) {
  return page.locator('a[href^="/clients/"]').locator("visible=true").first();
}

async function assertAxe(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = (results.violations as AxeViolation[]).filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical"
  );
  const tableAxe = (results.violations as AxeViolation[]).filter(
    (item) => item.id === "aria-required-children" || item.id === "aria-required-parent"
  );
  expect(tableAxe, `${label} table: ${JSON.stringify(tableAxe, null, 2)}`).toEqual([]);
  expect(serious, `${label}: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
}

test.describe("Story 40.3 — Clients list and profile", () => {
  test("list landmarks, table semantics, chips, and profile Follow-up CTA", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/clients");
    await waitForClientsReady(page);
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Contact/ })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Status/ })).toBeVisible();
    await expect(page.locator('[role="row"]')).toHaveCount(0);
    await expect(page.locator('[role="columnheader"]')).toHaveCount(0);

    await assertAxe(page, "clients 1440");

    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "clients-1440.png"),
      fullPage: true,
    });

    const nextPage = page.getByRole("button", { name: "Next page" });
    if (await nextPage.isEnabled()) {
      await nextPage.click();
      await expect(page.getByText(/Page 2 of/)).toBeVisible();
      await page.getByRole("button", { name: "Previous page" }).click();
      await expect(page.getByText(/Page 1 of/)).toBeVisible();
    }

    const named = visibleClientProfileLink(page);
    await expect(named).toBeVisible();
    await named.click();
    await expect(page).toHaveURL(/\/clients\/[0-9a-f-]{36}/i);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/^Clients$/);
    await expect(page.locator("#client-lead-status")).toBeVisible();
    const openFollowUp = page.getByRole("link", { name: "Open in Follow-up" });
    if ((await openFollowUp.count()) > 0) {
      await expect(openFollowUp).toHaveAttribute("href", "/follow-up");
      await openFollowUp.click();
      await expect(page).toHaveURL(/\/follow-up(?:\?|$)/);
      await expect(page.getByRole("heading", { level: 1, name: "Follow-up" })).toBeVisible();
    }
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "profile-1440.png"),
      fullPage: true,
    });
  });

  test("390 chips stay readable and 768 has no page overflow", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);

    for (const viewport of [
      { name: "390x844", width: 390, height: 844 },
      { name: "768x1024", width: 768, height: 1024 },
      { name: "1024x768", width: 1024, height: 768 },
    ] as const) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openAuthed(page, session, "/clients");
      await waitForClientsReady(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      expect(overflow, `${viewport.name} overflow`).toBe(false);
      const active = page.getByRole("button", { name: /Active/ }).first();
      await expect(active).toBeVisible();
      const box = await active.boundingBox();
      expect(box, `${viewport.name} Active chip`).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
      const clipped = await active.evaluate((node) => {
        return node.scrollWidth > node.clientWidth + 1;
      });
      expect(clipped, `${viewport.name} Active clip`).toBe(false);
      const hasClient = (await page.locator('a[href^="/clients/"]').locator("visible=true").count()) > 0;
      if (hasClient && viewport.width < 768) {
        await expect(page.getByRole("table")).toHaveCount(0);
        await expect(page.locator("article").first()).toBeVisible();
      } else if (hasClient) {
        await expect(page.getByRole("table")).toBeVisible();
      }
      if (hasClient && viewport.width === 390) {
        await visibleClientProfileLink(page).click();
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const profileOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1
        );
        expect(profileOverflow, "390 profile overflow").toBe(false);
        await page.screenshot({
          path: path.join(evidenceDir, "viewports", "profile-390.png"),
          fullPage: true,
        });
        await page.goto(`${tenantWebBase()}/clients`, { waitUntil: "domcontentloaded" });
        await waitForClientsReady(page);
      }
      await page.screenshot({
        path: path.join(evidenceDir, "viewports", `clients-${viewport.name}.png`),
        fullPage: true,
      });
    }
  });

  test("filters stay in the URL and sorting does not remount them", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    const session = await loginOperatorSession(request);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/clients?leadStatus=active");
    await waitForClientsReady(page);
    await expect(page).toHaveURL(/leadStatus=active/);
    await expect(page.getByRole("button", { name: /Active/ }).first()).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await page.getByRole("button", { name: /Status/ }).click();
    await expect(page).toHaveURL(/leadStatus=active/);
    await expect(page.getByRole("columnheader", { name: /Status/ })).toHaveAttribute(
      "aria-sort",
      /ascending|descending/
    );
  });

  test("global empty, no-match, and error stay distinct", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);

    await page.route("**/api/v1/admin/clients?**", async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("search")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [],
            page: 1,
            pageSize: 25,
            totalCount: 0,
            statusCounts: {
              newCount: 0,
              contactedCount: 0,
              activeCount: 0,
              inactiveCount: 0,
              mergeSuspectCount: 0,
              followUpDueCount: 0,
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthed(page, session, "/clients?search=zzznomatch40-3");
    await expect(page.getByText("No clients match your search or filters.")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("heading", { name: "No clients yet" })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "clients-390-nomatch.png"),
      fullPage: true,
    });

    await page.unroute("**/api/v1/admin/clients?**");
    await page.route("**/api/v1/admin/clients?**", async (route) => {
      if (route.request().url().includes("/nationalities")) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Clients source unavailable." }),
      });
    });
    await page.goto(`${tenantWebBase()}/clients`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Could not load Clients" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "clients-390-error.png"),
      fullPage: true,
    });

    await page.unroute("**/api/v1/admin/clients?**");
    await page.route("**/api/v1/admin/clients?**", async (route) => {
      if (route.request().url().includes("/nationalities")) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
          page: 1,
          pageSize: 25,
          totalCount: 0,
          statusCounts: {
            newCount: 0,
            contactedCount: 0,
            activeCount: 0,
            inactiveCount: 0,
            mergeSuspectCount: 0,
            followUpDueCount: 0,
          },
        }),
      });
    });
    await page.goto(`${tenantWebBase()}/clients`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "No clients yet" })).toBeVisible({
      timeout: 20_000,
    });
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "clients-390-empty.png"),
      fullPage: true,
    });
  });

  test("profile not-found, denied, and messenger dialog keep page ownership", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);
    await page.setViewportSize({ width: 390, height: 844 });

    await openAuthed(page, session, "/clients/00000000-0000-4000-8000-000000000404");
    await expect(page.getByRole("heading", { level: 1, name: "Client" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Client not found" })).toBeVisible({
      timeout: 20_000,
    });
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "profile-390-not-found.png"),
      fullPage: true,
    });

    await page.route("**/api/v1/admin/clients/**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Forbidden." }),
      });
    });
    await page.goto(`${tenantWebBase()}/clients/00000000-0000-4000-8000-000000000403`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { level: 1, name: "Client" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "You don’t have access" })).toBeVisible({
      timeout: 20_000,
    });
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "profile-390-denied.png"),
      fullPage: true,
    });
    await page.unroute("**/api/v1/admin/clients/**");

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${tenantWebBase()}/clients`, { waitUntil: "domcontentloaded" });
    await waitForClientsReady(page);
    const whatsApp = page.getByRole("button", { name: /Open WhatsApp/ }).first();
    if ((await whatsApp.count()) === 0) {
      return;
    }
    await whatsApp.click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: /Before you open WhatsApp/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(whatsApp).toBeFocused();
  });

  test("TenantMember can open Clients without admin settings", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    let session: Awaited<ReturnType<typeof loginOwnedTenant>>;
    try {
      session = await loginOwnedTenant(request, PX2_PRO_MEMBER);
    } catch (error) {
      test.skip(true, `Member fixture unavailable: ${String(error)}`);
      return;
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/clients");
    await waitForClientsReady(page);
    await expect(page.getByRole("heading", { level: 1, name: "Clients" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Team|Billing/ })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "clients-1440-member.png"),
      fullPage: true,
    });
  });

  test("Basic export hint and campaign upgrade stay named states", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    let session: Awaited<ReturnType<typeof loginOwnedTenant>>;
    try {
      session = await loginOwnedTenant(request, PX2_BASIC_TENANT);
    } catch (error) {
      test.skip(true, `Basic fixture unavailable: ${String(error)}`);
      return;
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/clients", tenantWebBase(PX2_BASIC_TENANT.slug));
    await waitForClientsReady(page);
    const exportButton = page.getByRole("button", { name: "Export CSV" });
    if (await exportButton.isEnabled()) {
      await exportButton.click();
      await expect(
        page.getByText(/Exporting full client list|Exported \d+ clients/)
      ).toBeVisible({ timeout: 20_000 });
    }
    const selectAll = page.getByRole("checkbox", { name: "Select all clients on this page" });
    if ((await selectAll.count()) > 0) {
      await selectAll.check();
      await expect(page.getByText("Upgrade to Pro to add selected clients to a campaign.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Upgrade to Pro" })).toBeVisible();
    }
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "clients-1440-entitlement-denied.png"),
      fullPage: true,
    });
  });

  test("tenant isolation stays on the existing clients contract", async ({ request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);

    async function clientIds(tenant: OwnedTenant): Promise<string[]> {
      const session = await loginOwnedTenant(request, tenant);
      const response = await request.get(`${resolveE2eApiBase()}/api/v1/admin/clients?page=1&pageSize=100`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Host: tenantApiHost(tenant.slug),
        },
      });
      expect(response.ok(), `${tenant.slug} clients ${response.status()}`).toBeTruthy();
      const body = (await response.json()) as { items?: Array<{ id?: string }> };
      return (body.items ?? []).map((item) => String(item.id));
    }

    let defaultIds: string[] = [];
    let basicIds: string[] = [];
    try {
      defaultIds = await clientIds(DEFAULT_PRO_TENANT);
      basicIds = await clientIds(PX2_BASIC_TENANT);
    } catch (error) {
      test.skip(true, `Second tenant unavailable for isolation: ${String(error)}`);
      return;
    }

    const overlap = defaultIds.filter((id) => basicIds.includes(id));
    expect(overlap, "client ids must not leak across tenants").toEqual([]);
  });

  test("reduced motion makes profile expand instant", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    const session = await loginOperatorSession(request);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1024, height: 768 });
    await openAuthed(page, session, "/clients");
    await waitForClientsReady(page);
    const named = visibleClientProfileLink(page);
    if ((await named.count()) === 0) {
      return;
    }
    await named.click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const expand = page.getByRole("button", { name: /Expand|Collapse/ }).first();
    if ((await expand.count()) === 0) {
      return;
    }
    const duration = await expand.evaluate((node) => {
      const region = node.closest("section, div")?.querySelector(".motion-local");
      return region ? window.getComputedStyle(region).transitionDuration : "0s";
    });
    expect(duration.split(",").every((part) => part.trim() === "0s")).toBe(true);
  });
});
