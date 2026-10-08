import fs from "node:fs";
import path from "path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { analyzeAxe } from "./helpers/analyze-axe";

import {
  loginOperatorSession,
  openActivityTab,
  seedOperatorAuthSession,
  tenantWebBase,
  waitForOperatorWorkspace,
  waitForReportsContent,
} from "./helpers/registration-e2e-api";
import { provisionOwnedActivity } from "./helpers/e2e-owned-fixtures";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-39-4"
);

const ROOMS: Array<{ path: string; h1: string | RegExp; file: string }> = [
  { path: "/dashboard", h1: "Dashboard", file: "dashboard" },
  { path: "/clients", h1: "Clients", file: "clients" },
  { path: "/activities", h1: "Activities", file: "activities" },
  { path: "/analytics", h1: "Analytics", file: "analytics" },
  { path: "/dashboard/website", h1: "Website Studio", file: "website-studio" },
  { path: "/settings/profile", h1: "Your account", file: "settings" },
];

const AXE_ROOMS = ["/dashboard", "/clients", "/activities", "/settings/profile"] as const;

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
  await waitForOperatorWorkspace(page);
}

async function headingMap(page: Page) {
  return page.evaluate(() => {
    const h1s = [...document.querySelectorAll("h1")].map((node) => node.textContent?.trim() ?? "");
    const h2s = [...document.querySelectorAll("h2")].map((node) => node.textContent?.trim() ?? "");
    const mains = document.querySelectorAll("main").length;
    return {
      h1s,
      h2s,
      mains,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
}

async function skipWebsiteTour(page: Page): Promise<void> {
  const skipTour = page.getByRole("button", { name: "Skip tour" });
  if (await skipTour.isVisible().catch(() => false)) {
    await skipTour.click();
  }
}

function pageHeader(page: Page): Locator {
  return page.locator("main header").first();
}

async function assertMinTouchTarget(
  locator: Locator,
  label: string
): Promise<{ width: number; height: number }> {
  await expect(locator, label).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} bounding box`).toBeTruthy();
  expect(box!.width, `${label} width`).toBeGreaterThanOrEqual(44);
  expect(box!.height, `${label} height`).toBeGreaterThanOrEqual(44);
  return { width: box!.width, height: box!.height };
}

async function assertNoHorizontalOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  expect(overflow, label).toBe(false);
}

async function settleForAxe(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const enter = document.querySelector("[data-admin-route-transition]");
    if (!enter) {
      return;
    }
    const deadline = Date.now() + 1200;
    while (Date.now() < deadline) {
      const opacity = getComputedStyle(enter).opacity;
      const running = enter
        .getAnimations({ subtree: false })
        .some((animation) => animation.playState === "running");
      if (opacity === "1" && !running) {
        return;
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  });
}

async function assertHeaderActionsStayInViewport(page: Page, label: string): Promise<void> {
  const clipped = await pageHeader(page)
    .locator("a, button, select")
    .evaluateAll((nodes) => {
      const width = window.innerWidth;
      return nodes.some((node) => {
        const box = node.getBoundingClientRect();
        return box.right > width + 1 || box.left < -1;
      });
    });
  expect(clipped, `${label} clipped`).toBe(false);
}

test.describe("Story 39.4 — page-header hierarchy", () => {
  test("heading map, 44px actions, Form Studio, and axe with contrast", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const session = await loginOperatorSession(request);
    const measurements: Array<Record<string, unknown>> = [];

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    const greeting = page.getByText(/Good (morning|afternoon|evening)/);
    await expect(greeting).toBeVisible();
    expect(await greeting.evaluate((node) => node.tagName.toLowerCase())).toBe("p");
    expect(await greeting.evaluate((node) => node.closest("h1,h2"))).toBeNull();

    for (const room of ROOMS) {
      await page.goto(`${tenantWebBase()}${room.path}`, { waitUntil: "domcontentloaded" });
      await waitForOperatorWorkspace(page);
      if (room.path === "/analytics") {
        await waitForReportsContent(page);
      }
      if (room.path === "/dashboard/website") {
        await skipWebsiteTour(page);
      }
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      const map = await headingMap(page);
      expect(map.mains, room.path).toBe(1);
      expect(map.h1s, room.path).toHaveLength(1);
      expect(map.h1s[0], room.path).toMatch(room.h1);
      await page.screenshot({
        path: path.join(evidenceDir, "viewports", `${room.file}-1440.png`),
        fullPage: true,
      });
    }

    for (const viewport of [
      { name: "390", width: 390, height: 844 },
      { name: "767", width: 767, height: 1024 },
      { name: "768", width: 768, height: 1024 },
    ] as const) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const room of ROOMS) {
        await page.goto(`${tenantWebBase()}${room.path}`, { waitUntil: "domcontentloaded" });
        await waitForOperatorWorkspace(page);
        if (room.path === "/analytics") {
          await waitForReportsContent(page);
        }
        if (room.path === "/dashboard/website") {
          await skipWebsiteTour(page);
        }
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        await assertNoHorizontalOverflow(page, `${room.path} ${viewport.name}`);
        await assertHeaderActionsStayInViewport(page, `${room.path} ${viewport.name}`);
        if (viewport.name === "390") {
          await page.screenshot({
            path: path.join(evidenceDir, "viewports", `${room.file}-390.png`),
            fullPage: true,
          });
        }
      }
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${tenantWebBase()}/clients`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    const exportCsv = pageHeader(page).getByRole("button", { name: /Export CSV/i });
    measurements.push({
      control: "button",
      route: "/clients",
      viewport: "1440x900",
      ...(await assertMinTouchTarget(exportCsv, "Clients Export CSV")),
    });

    await page.goto(`${tenantWebBase()}/activities`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    const newActivity = pageHeader(page).locator("a, button").filter({ hasText: /New activity/i });
    measurements.push({
      control: (await newActivity.evaluate((node) => node.tagName.toLowerCase())) === "a" ? "link" : "button",
      route: "/activities",
      viewport: "1440x900",
      ...(await assertMinTouchTarget(newActivity, "Activities New activity")),
    });

    await page.goto(`${tenantWebBase()}/clients`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    const clientHref = await page
      .locator('a[href^="/clients/"]')
      .first()
      .getAttribute("href", { timeout: 30_000 });
    expect(clientHref).toMatch(/\/clients\/[0-9a-f-]{36}/i);
    await page.goto(`${tenantWebBase()}${clientHref}`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/clients\/[0-9a-f-]{36}/i);
    await waitForOperatorWorkspace(page);
    const whatsApp = pageHeader(page).getByRole("button", { name: /WhatsApp/i });
    const leadStatus = pageHeader(page).locator("#client-lead-status");
    measurements.push({
      control: "button",
      route: "client-profile",
      viewport: "1440x900",
      ...(await assertMinTouchTarget(whatsApp, "Client profile WhatsApp")),
    });
    measurements.push({
      control: "select",
      route: "client-profile",
      viewport: "1440x900",
      ...(await assertMinTouchTarget(leadStatus, "Client profile lead status")),
    });

    for (const viewport of [
      { name: "390", width: 390, height: 844 },
      { name: "768", width: 768, height: 1024 },
    ] as const) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await assertNoHorizontalOverflow(page, `client-profile ${viewport.name}`);
      await assertHeaderActionsStayInViewport(page, `client-profile ${viewport.name}`);
      measurements.push({
        control: "button",
        route: "client-profile",
        viewport: `${viewport.width}x${viewport.height}`,
        ...(await assertMinTouchTarget(whatsApp, `Client WhatsApp ${viewport.name}`)),
      });
      measurements.push({
        control: "select",
        route: "client-profile",
        viewport: `${viewport.width}x${viewport.height}`,
        ...(await assertMinTouchTarget(leadStatus, `Client select ${viewport.name}`)),
      });
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    const activity = await provisionOwnedActivity(request, session, {
      ownerKey: "39-4-header",
      workerIndex: test.info().workerIndex,
    });
    await openActivityTab(page, activity.id, "form", session);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 2, name: "Form builder" })).toBeVisible();
    await page.locator("#form-studio-tab-preview").click();
    const preview = page.locator("#form-studio-preview-panel");
    await expect(preview).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(preview.locator("main")).toHaveCount(0);
    await expect(preview.getByRole("heading", { level: 1 })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "form-studio-boundary-1440.png"),
      fullPage: true,
    });

    const axeReport: Array<Record<string, unknown>> = [];
    for (const route of AXE_ROOMS) {
      await page.goto(`${tenantWebBase()}${route}`, { waitUntil: "domcontentloaded" });
      await waitForOperatorWorkspace(page);
      await settleForAxe(page);
      const results = await analyzeAxe(page);
      const serious = results.violations.filter(
        (item) => item.impact === "serious" || item.impact === "critical"
      );
      const classified = serious.map((item) => {
        const preexistingClientRow =
          route === "/clients" &&
          (item.id === "aria-required-children" || item.id === "aria-required-parent") &&
          item.nodes.every((node) => node.html.includes('role="row"'));
        return {
          id: item.id,
          impact: item.impact,
          nodes: item.nodes.length,
          classification: preexistingClientRow
            ? "pre-existing client list role=row (Epic 40.3 / 43.5)"
            : "new",
        };
      });
      axeReport.push({
        route,
        contrastDisabled: false,
        seriousOrCritical: classified,
      });
      const novel = classified.filter((item) => item.classification === "new");
      expect(novel, `${route} axe ${JSON.stringify(classified, null, 2)}`).toEqual([]);
    }

    fs.writeFileSync(
      path.join(evidenceDir, "action-measurements.json"),
      JSON.stringify({ measurements }, null, 2)
    );
    fs.writeFileSync(
      path.join(evidenceDir, "axe-39-4.json"),
      JSON.stringify({ contrastDisabled: false, routes: axeReport }, null, 2)
    );
  });
});
