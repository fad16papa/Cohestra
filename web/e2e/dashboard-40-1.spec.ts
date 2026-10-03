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
  "../../_bmad-output/planning-artifacts/evidence/px2-40-1"
);

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

async function assertNoOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  expect(overflow, label).toBe(false);
}

async function waitForDashboardReady(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Needs follow-up" }).or(page.getByLabel("Loading follow-up queue"))
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Needs follow-up" })).toBeVisible({
    timeout: 20_000,
  });
}

test.describe("Story 40.1 — dashboard command center", () => {
  test("hierarchy, views, history, skip, follow-up, and viewports", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/dashboard");
    await waitForDashboardReady(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator("main#main-content")).toHaveCount(1);

    const greeting = page.getByText(/Good (morning|afternoon|evening)/);
    await expect(greeting).toBeVisible();
    expect(await greeting.evaluate((node) => node.tagName.toLowerCase())).toBe("p");
    expect(await greeting.evaluate((node) => node.closest("h1,h2"))).toBeNull();

    const needsAttention = page.getByRole("heading", { name: "Needs attention" });
    const needsFollowUp = page.getByRole("heading", { name: "Needs follow-up" });
    await expect(needsAttention).toBeVisible();
    await expect(needsFollowUp).toBeVisible();
    const order = await page.evaluate(() => {
      const attention = document.getElementById("intelligence-brief-heading");
      const followUp = document.getElementById("follow-up-queue-heading");
      if (!attention || !followUp) {
        return null;
      }
      return Boolean(attention.compareDocumentPosition(followUp) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(order).toBe(true);

    const viewAll = page.getByRole("link", { name: "View all", exact: true });
    await expect(viewAll).toHaveAttribute("href", "/follow-up");

    const transition = page.locator("[data-admin-route-transition]");
    await transition.evaluate((node) => {
      node.setAttribute("data-40-1-transition", "stable");
    });
    const sessionId = await page.getByTestId("dashboard-session").getAttribute("data-dashboard-session");

    await page.getByRole("tab", { name: "Graphs" }).click();
    await expect(page).toHaveURL(/view=graphs/);
    await expect(page.getByRole("tab", { name: "Graphs" })).toHaveAttribute("aria-selected", "true");
    expect(await page.getByTestId("dashboard-session").getAttribute("data-dashboard-session")).toBe(
      sessionId
    );
    await expect(transition).toHaveAttribute("data-40-1-transition", "stable");
    await expect(needsAttention).toBeVisible();
    await expect(needsFollowUp).toBeVisible();

    await page.goBack();
    await expect(page.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    await expect(page).not.toHaveURL(/view=graphs/);
    expect(await page.getByTestId("dashboard-session").getAttribute("data-dashboard-session")).toBe(
      sessionId
    );
    await expect(transition).toHaveAttribute("data-40-1-transition", "stable");

    await openAuthed(page, session, "/dashboard?view=table");
    await waitForDashboardReady(page);
    await expect(page.getByRole("tab", { name: "Table" })).toHaveAttribute("aria-selected", "true");

    await openAuthed(page, session, "/dashboard?view=kanban");
    await waitForDashboardReady(page);
    await expect(page.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");

    await page.getByRole("link", { name: "Skip to main content" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main-content")).toBeFocused();

    const graphTab = page.getByRole("tab", { name: "Graphs" });
    const box = await graphTab.boundingBox();
    expect(box?.width, "view tab width").toBeGreaterThanOrEqual(44);
    expect(box?.height, "view tab height").toBeGreaterThanOrEqual(44);
    await assertNoOverflow(page, "dashboard 1440");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "dashboard-overview-1440.png"),
      fullPage: true,
    });

    await page.getByRole("tab", { name: "Graphs" }).click();
    await expect(page.getByRole("tab", { name: "Graphs" })).toHaveAttribute("aria-selected", "true");
    await assertNoOverflow(page, "dashboard graphs 1440");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "dashboard-graphs-1440.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthed(page, session, "/dashboard");
    await waitForDashboardReady(page);
    await assertNoOverflow(page, "dashboard 390");
    const mobileTab = page.getByRole("tab", { name: "Overview" });
    const mobileBox = await mobileTab.boundingBox();
    expect(mobileBox?.height, "390 view tab height").toBeGreaterThanOrEqual(44);
    expect(mobileBox?.width, "390 view tab width").toBeGreaterThanOrEqual(44);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "dashboard-overview-390.png"),
      fullPage: true,
    });

    await page.getByRole("tab", { name: "Graphs" }).click();
    await expect(page.getByRole("tab", { name: "Graphs" })).toHaveAttribute("aria-selected", "true");
    await assertNoOverflow(page, "dashboard graphs 390");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "dashboard-graphs-390.png"),
      fullPage: true,
    });

    await page.getByRole("tab", { name: "Table" }).click();
    await expect(page.getByRole("tab", { name: "Table" })).toHaveAttribute("aria-selected", "true");
    await assertNoOverflow(page, "dashboard table 390");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "dashboard-table-390.png"),
      fullPage: true,
    });
  });

  test("query overrides stored preference; preference applies only when absent", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    const session = await loginOperatorSession(request);

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/dashboard");
    await waitForDashboardReady(page);
    await page.evaluate(() => {
      window.localStorage.setItem("cohestra.dashboard.viewMode", "graphs");
    });

    await openAuthed(page, session, "/dashboard?view=table");
    await waitForDashboardReady(page);
    await expect(page.getByRole("tab", { name: "Table" })).toHaveAttribute("aria-selected", "true");

    await openAuthed(page, session, "/dashboard");
    await waitForDashboardReady(page);
    await expect(page.getByRole("tab", { name: "Graphs" })).toHaveAttribute("aria-selected", "true");
  });

  test("re-selecting the active view is a true no-op", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    const session = await loginOperatorSession(request);

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/dashboard");
    await waitForDashboardReady(page);
    await page.evaluate(() => {
      window.localStorage.setItem("cohestra.dashboard.viewMode", "graphs");
    });

    await openAuthed(page, session, "/dashboard?view=table");
    await waitForDashboardReady(page);
    await expect(page.getByRole("tab", { name: "Table" })).toHaveAttribute("aria-selected", "true");

    const before = await page.evaluate(() => {
      window.addEventListener("cohestra.dashboard.viewMode", () => {
        const root = window as Window & { __dashboardViewEvents?: number };
        root.__dashboardViewEvents = (root.__dashboardViewEvents ?? 0) + 1;
      });
      return {
        href: window.location.href,
        historyLength: window.history.length,
        preference: window.localStorage.getItem("cohestra.dashboard.viewMode"),
      };
    });

    await page.getByRole("tab", { name: "Table" }).click();

    const after = await page.evaluate(() => {
      const root = window as Window & { __dashboardViewEvents?: number };
      return {
        href: window.location.href,
        historyLength: window.history.length,
        preference: window.localStorage.getItem("cohestra.dashboard.viewMode"),
        events: root.__dashboardViewEvents ?? 0,
      };
    });

    expect(after.href).toBe(before.href);
    expect(after.historyLength).toBe(before.historyLength);
    expect(after.preference).toBe("graphs");
    expect(before.preference).toBe("graphs");
    expect(after.events).toBe(0);
    await expect(page.getByRole("tab", { name: "Table" })).toHaveAttribute("aria-selected", "true");
  });

  test("follow-up fetch failure stays an error, not all caught up", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    const session = await loginOperatorSession(request);

    await page.route("**/api/v1/admin/clients**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ title: "Could not load people who need follow-up." }),
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Needs follow-up" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByText(/Request failed|Could not load/i)).toBeVisible();
    await expect(page.getByText("You're all caught up")).toHaveCount(0);
    await expect(page.getByText("all caught up")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "View all", exact: true })).toHaveAttribute(
      "href",
      "/follow-up"
    );
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("metrics error is honest for every view", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    const session = await loginOperatorSession(request);

    await page.route("**/api/v1/admin/dashboard/metrics**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ title: "Could not load dashboard data." }),
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/dashboard?view=graphs");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Graphs" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText(/Could not load dashboard data|Try again/i)).toBeVisible();
    await expect(page.getByText("You're all caught up")).toHaveCount(0);
  });
});
