import fs from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  PX2_BASIC_TENANT,
  loginOwnedTenant,
  provisionOwnedActivity,
} from "./helpers/e2e-owned-fixtures";
import {
  DEFAULT_TENANT_SLUG,
  resolveE2eApiBase,
  tenantApiHost,
  tenantWebOrigin,
} from "./helpers/owned-fixture-data";
import {
  loginOperatorSession,
  seedOperatorAuthSession,
  tenantWebBase,
  waitForOperatorWorkspace,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-40-5"
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

async function waitForFollowUpReady(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: "Follow-up" })).toBeVisible();
  await expect(
    page
      .getByRole("radiogroup", { name: "Follow-up category" })
      .or(page.getByRole("heading", { name: "Could not load Follow-up" }))
      .or(page.getByRole("heading", { name: "You don’t have access to Follow-up" }))
  ).toBeVisible({ timeout: 20_000 });
}

async function waitForClientsReady(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: "Clients" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Lead queue filters" })).toBeVisible({
    timeout: 20_000,
  });
}

async function assertNoOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  expect(overflow, label).toBe(false);
}

async function assertLandmarks(page: Page): Promise<void> {
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Skip to main content" })).toHaveCount(1);
}

async function assertAxe(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = (results.violations as AxeViolation[]).filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical"
  );
  expect(serious, `${label}: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
}

function pathAndSearch(url: string): string {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`;
}

async function firstFollowUpClientHref(page: Page): Promise<string | null> {
  const link = page.getByRole("link", { name: /^Open / }).first();
  if ((await link.count()) === 0) {
    return null;
  }
  return link.getAttribute("href");
}

function expectedFollowUpPath(category: string, pageNum = 1): string {
  const params = new URLSearchParams();
  if (category !== "due-now") {
    params.set("category", category);
  }
  if (pageNum > 1) {
    params.set("page", String(pageNum));
  }
  const query = params.toString();
  return query ? `/follow-up?${query}` : "/follow-up";
}

async function fetchJson(
  request: Parameters<typeof loginOperatorSession>[0],
  session: Awaited<ReturnType<typeof loginOperatorSession>>,
  url: string,
  slug?: string
): Promise<unknown> {
  const response = await request.get(url, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Host: tenantApiHost(slug ?? DEFAULT_TENANT_SLUG),
    },
  });
  if (!response.ok()) {
    throw new Error(`${url} failed: ${response.status()} ${await response.text()}`);
  }
  return response.json();
}

test.describe("Story 40.5 — cross-module continuity", () => {
  test("follow-up, clients, dashboard, registration, history, palette, and a11y", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(300_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);
    const proofs: Record<string, string> = {};

    const apiBase = resolveE2eApiBase();
    const clientsPayload = (await fetchJson(
      request,
      session,
      `${apiBase}/api/v1/admin/clients?page=1&pageSize=25`
    )) as { items?: Array<{ id: string; fullName?: string; email?: string }> };
    const firstClientId = clientsPayload.items?.[0]?.id;
    if (!firstClientId) {
      throw new Error("default tenant must have at least one client");
    }
    const foreignLabel =
      clientsPayload.items?.[0]?.fullName || clientsPayload.items?.[0]?.email || firstClientId;

    await page.setViewportSize({ width: 1440, height: 900 });
    let liveFollowUpWalk: string | null = null;
    for (const category of ["due-now", "at-risk", "opportunity", "healthy"] as const) {
      await openAuthed(page, session, `/follow-up?category=${category}`);
      await waitForFollowUpReady(page);
      const href = await firstFollowUpClientHref(page);
      if (!href) {
        continue;
      }
      expect(href).toContain(`ctx=fu%3A${category}`);
      if (liveFollowUpWalk) {
        continue;
      }
      const restoredFollowUpUrl = expectedFollowUpPath(category);
      await page.goto(`${tenantWebBase()}${href}`, { waitUntil: "domcontentloaded" });
      await waitForOperatorWorkspace(page);
      const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
      await expect(crumbs).toBeVisible();
      await crumbs.getByRole("link", { name: "Follow-up" }).click();
      await waitForFollowUpReady(page);
      expect(pathAndSearch(page.url())).toBe(restoredFollowUpUrl);
      await page.goBack();
      await expect(page).toHaveURL(/\/clients\/[0-9a-f-]{36}/i);
      await page.goForward();
      await waitForFollowUpReady(page);
      expect(pathAndSearch(page.url())).toBe(restoredFollowUpUrl);
      liveFollowUpWalk = `${category}:${restoredFollowUpUrl}`;
    }
    expect(liveFollowUpWalk, "Follow-up list must expose at least one client").toBeTruthy();
    proofs.followUpLiveWalk = liveFollowUpWalk ?? "";

    await openAuthed(
      page,
      session,
      `/clients/${firstClientId}?ctx=${encodeURIComponent("fu:opportunity:2")}`
    );
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const pagedFollowUp = page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("link", { name: "Follow-up" });
    await expect(pagedFollowUp).toHaveAttribute("href", expectedFollowUpPath("opportunity", 2));
    await pagedFollowUp.click();
    await waitForFollowUpReady(page);
    expect(new URL(page.url()).searchParams.get("category")).toBe("opportunity");
    proofs.followUpPagedReturn = pathAndSearch(page.url());
    proofs.followUpPagedHref = expectedFollowUpPath("opportunity", 2);

    await openAuthed(page, session, "/clients?leadStatus=active&sortBy=name&sortDir=asc");
    await waitForClientsReady(page);
    const clientsUrl = pathAndSearch(page.url());
    proofs.clientsFiltered = clientsUrl;
    const clientLink = page.locator('a[href*="/clients/"]').locator("visible=true").first();
    await expect(clientLink).toBeVisible();
    const clientHref = await clientLink.getAttribute("href");
    expect(clientHref).toContain("ctx=cl%3A");
    await clientLink.click();
    await expect(page).toHaveURL(/\/clients\/[0-9a-f-]{36}/i);
    await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Clients" }).click();
    await waitForClientsReady(page);
    expect(pathAndSearch(page.url())).toBe(clientsUrl);

    await openAuthed(page, session, "/dashboard?view=graphs");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Graphs" })).toHaveAttribute("aria-selected", "true");
    const graphBar = page.locator(".recharts-bar-rectangle, .recharts-rectangle").first();
    await expect(graphBar, "dashboard graphs must expose a performance bar").toBeVisible();
    await graphBar.click();
    await expect(page).toHaveURL(/\/activities\/[0-9a-f-]{36}.*ctx=d%3Agraphs/i);
    proofs.dashboardgraphs = pathAndSearch(page.url());
    await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard\?view=graphs/);

    await openAuthed(page, session, "/dashboard?view=table");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    const tableActivity = page
      .locator('a[href*="/activities/"][href*="ctx=d%3Atable"]')
      .locator("visible=true")
      .first();
    await expect(tableActivity, "dashboard table must expose an activity link").toBeVisible();
    proofs.dashboardtable = (await tableActivity.getAttribute("href")) ?? "";
    await tableActivity.click();
    await expect(page).toHaveURL(/\/activities\/[0-9a-f-]{36}.*ctx=d%3Atable/i);
    await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard\?view=table/);
    let registrationProof = "no-client-with-activity-id";
    for (const item of clientsPayload.items ?? []) {
      const detail = (await fetchJson(
        request,
        session,
        `${apiBase}/api/v1/admin/clients/${item.id}`
      )) as {
        registrationHistory?: Array<{ activityId?: string; activityName?: string }>;
      };
      const entry = detail.registrationHistory?.find((row) => row.activityId);
      if (!entry?.activityId) {
        continue;
      }
      await openAuthed(page, session, `/clients/${item.id}?ctx=fu%3Adue-now`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const activityLink = page.locator(`a[href*="/activities/${entry.activityId}"]`).first();
      await expect(activityLink).toBeVisible();
      const href = await activityLink.getAttribute("href");
      expect(href).toContain(entry.activityId);
      expect(href).not.toContain(encodeURIComponent(entry.activityName ?? "___none___"));
      registrationProof = href ?? entry.activityId;
      await activityLink.click();
      await expect(page).toHaveURL(new RegExp(`/activities/${entry.activityId}`, "i"));
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForOperatorWorkspace(page);
      await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Follow-up" })).toBeVisible();
      break;
    }
    proofs.registrationActivity = registrationProof;

    await openAuthed(page, session, `/clients/${firstClientId}?ctx=https://evil.test`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const fallback = page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Clients" });
    await expect(fallback).toHaveAttribute("href", "/clients");
    await fallback.click();
    await expect(page).toHaveURL(/\/clients(?:\?|$)/);
    expect(new URL(page.url()).origin).toBe(new URL(tenantWebBase()).origin);

    await openAuthed(page, session, `/clients/${firstClientId}?ctx=${encodeURIComponent("//example.com")}`);
    await expect(
      page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Clients" })
    ).toHaveAttribute("href", "/clients");

    const basic = await loginOwnedTenant(request, PX2_BASIC_TENANT);
    await openAuthed(
      page,
      basic,
      `/clients/${firstClientId}`,
      tenantWebOrigin(PX2_BASIC_TENANT.slug)
    );
    const deniedHeading = page.getByRole("heading", {
      name: /don’t have access|Client not found/i,
    });
    await expect(deniedHeading).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: foreignLabel })).toHaveCount(0);
    proofs.crossTenant = (await deniedHeading.innerText()).trim();

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/dashboard");
    const search = page.getByRole("button", { name: "Open command palette" }).first();
    await search.click();
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(palette).toBeVisible();
    await page.getByLabel("Search commands").fill("Follow-up");
    await palette.getByRole("button", { name: "Follow-up" }).click();
    await expect(page).toHaveURL(/\/follow-up(?:\?|$)/);
    await search.click();
    await page.getByLabel("Search commands").fill("Analytics");
    await palette.getByRole("button", { name: "Analytics" }).click();
    await expect(page).toHaveURL(/\/analytics(?:\?|$)/);
    await search.click();
    await page.getByLabel("Search commands").fill("Cohestra AI");
    await palette.getByRole("button", { name: "Cohestra AI" }).click();
    await expect(page).toHaveURL(/\/ai(?:\?|$)/);
    await search.click();
    await expect(page.getByLabel("Search commands")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(palette).toHaveCount(0);
    await expect(search).toBeFocused();
    proofs.palette = "/follow-up /analytics /ai";

    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "continuity-palette-1440.png"),
    });

    for (const viewport of [
      { name: "390", width: 390, height: 844 },
      { name: "430", width: 430, height: 932 },
      { name: "767", width: 767, height: 1024 },
    ] as const) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (!firstClientId) {
        continue;
      }
      await openAuthed(page, session, `/clients/${firstClientId}?ctx=fu%3Adue-now`);
      const back = page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", {
        name: "Back to Follow-up",
      });
      await expect(back).toBeVisible();
      const box = await back.boundingBox();
      expect(box, `${viewport.name} Back target`).toBeTruthy();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await expect(
        page
          .getByRole("navigation", { name: "Breadcrumb" })
          .getByRole("link", { name: "Follow-up", exact: true })
      ).toHaveCount(0);
      await assertNoOverflow(page, `${viewport.name} client overflow`);
      await assertLandmarks(page);
      await page.screenshot({
        path: path.join(evidenceDir, "viewports", `continuity-${viewport.name}.png`),
        fullPage: true,
      });
    }

    for (const viewport of [
      { name: "768", width: 768, height: 1024 },
      { name: "1024", width: 1024, height: 768 },
      { name: "1440", width: 1440, height: 900 },
    ] as const) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (!firstClientId) {
        continue;
      }
      await openAuthed(page, session, `/clients/${firstClientId}?ctx=fu%3Adue-now`);
      const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
      await expect(crumbs).toBeVisible();
      await expect(crumbs.locator("ol")).toHaveCount(1);
      await expect(crumbs.getByRole("link", { name: "Follow-up" })).toBeVisible();
      await expect(crumbs.locator('[aria-current="page"]')).toHaveCount(1);
      await expect(page.getByRole("link", { name: "Back to Follow-up" })).toHaveCount(0);
      await assertNoOverflow(page, `${viewport.name} overflow`);
      await assertLandmarks(page);
      await page.screenshot({
        path: path.join(evidenceDir, "viewports", `continuity-${viewport.name}.png`),
        fullPage: true,
      });
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await assertAxe(page, "continuity 1440");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openAuthed(page, session, "/follow-up?category=healthy");
    await waitForFollowUpReady(page);
    await assertLandmarks(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });

    const owned = await provisionOwnedActivity(request, session, {
      ownerKey: "40-5-form",
      workerIndex: test.info().workerIndex,
    });
    await openAuthed(page, session, `/activities/${owned.id}?tab=form&ctx=cl%3A`);
    await expect(page.getByRole("tab", { name: /^Form$/ })).toHaveAttribute("aria-selected", "true");
    const welcome = page.getByPlaceholder("Welcome! Tell registrants what to expect…");
    await expect(welcome).toBeVisible({ timeout: 30_000 });
    await welcome.fill("Continuity draft must survive tab query writes.");
    await page.getByRole("tab", { name: /^Overview$/ }).click();
    await expect(page).toHaveURL(/\/activities\/[0-9a-f-]{36}.*ctx=cl/i);
    await page.getByRole("tab", { name: /^Form$/ }).click();
    await expect(welcome).toHaveValue("Continuity draft must survive tab query writes.");
    await expect(page).toHaveURL(/tab=form.*ctx=cl|ctx=cl.*tab=form/i);

    fs.writeFileSync(
      path.join(evidenceDir, "url-history-proofs.json"),
      JSON.stringify(proofs, null, 2)
    );
  });
});
