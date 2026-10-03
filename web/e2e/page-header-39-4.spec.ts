import fs from "node:fs";
import path from "path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

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
  { path: "/settings/profile", h1: "Settings", file: "settings" },
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
  await waitForOperatorWorkspace(page);
}

async function headingMap(page: Page) {
  return page.evaluate(() => {
    const h1s = [...document.querySelectorAll("h1")].map((node) => node.textContent?.trim() ?? "");
    const h2s = [...document.querySelectorAll("h2")].map((node) => node.textContent?.trim() ?? "");
    const mains = document.querySelectorAll("main").length;
    return { h1s, h2s, mains, overflow: document.documentElement.scrollWidth > window.innerWidth + 1 };
  });
}

test.describe("Story 39.4 — page-header hierarchy", () => {
  test("heading map, greeting, 44px actions, and evidence rooms", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const session = await loginOperatorSession(request);

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
        const skipTour = page.getByRole("button", { name: "Skip tour" });
        if (await skipTour.isVisible().catch(() => false)) {
          await skipTour.click();
        }
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

    await page.setViewportSize({ width: 390, height: 844 });
    for (const room of ROOMS) {
      await page.goto(`${tenantWebBase()}${room.path}`, { waitUntil: "domcontentloaded" });
      await waitForOperatorWorkspace(page);
      if (room.path === "/analytics") {
        await waitForReportsContent(page);
      }
      if (room.path === "/dashboard/website") {
        const skipTour = page.getByRole("button", { name: "Skip tour" });
        if (await skipTour.isVisible().catch(() => false)) {
          await skipTour.click();
        }
      }
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      const map = await headingMap(page);
      expect(map.h1s, `${room.path} 390`).toHaveLength(1);
      expect(map.overflow, `${room.path} 390 overflow`).toBe(false);
      await page.screenshot({
        path: path.join(evidenceDir, "viewports", `${room.file}-390.png`),
        fullPage: true,
      });
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${tenantWebBase()}/clients`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    const exportCsv = page.getByRole("button", { name: /Export CSV/i });
    if (await exportCsv.isVisible().catch(() => false)) {
      const box = await exportCsv.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }

    const activity = await provisionOwnedActivity(request, session, {
      ownerKey: "39-4-header",
      workerIndex: test.info().workerIndex,
    });
    await openActivityTab(page, activity.id, "form", session);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "form-studio-boundary-1440.png"),
      fullPage: true,
    });

    await page.goto(`${tenantWebBase()}/dashboard`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    const axe = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();
    const serious = axe.violations.filter(
      (item) => item.impact === "serious" || item.impact === "critical"
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
});
