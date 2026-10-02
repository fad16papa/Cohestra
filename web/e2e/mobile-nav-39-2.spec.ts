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
  "../../_bmad-output/planning-artifacts/evidence/px2-39-2"
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

function dock(page: Page) {
  return page.getByRole("navigation", { name: "Primary" });
}

test.describe("Story 39.2 — mobile navigation", () => {
  test("tabs, Website→More, Follow-up, sheet, FAB, breakpoints", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(90_000);
    const session = await loginOperatorSession(request);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthed(page, session, "/dashboard");

    const tabs = dock(page);
    await expect(tabs).toBeVisible();
    const labels = await tabs.locator("a, button").evaluateAll((nodes) =>
      nodes.map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim())
    );
    expect(labels).toEqual(["Home", "Clients", "Activities", "Follow-up", "More"]);
    await expect(tabs.getByRole("link", { name: "Website" })).toHaveCount(0);

    const homeTab = tabs.getByRole("link", { name: /Home/ });
    await expect(homeTab).toHaveAttribute("aria-current", "page");
    await expect(homeTab).toHaveAttribute("aria-label", "Home, selected");

    const homeBox = await homeTab.boundingBox();
    expect(homeBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(homeBox?.width ?? 0).toBeGreaterThanOrEqual(44);

    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "dock-390x844.png"),
      fullPage: false,
    });

    await page.goto(`${tenantWebBase()}/dashboard/website`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(homeTab).not.toHaveAttribute("aria-current", "page");
    const moreOnWebsite = tabs.getByRole("button", { name: /More/ });
    await expect(moreOnWebsite).toHaveAttribute("aria-current", "page");
    await expect(moreOnWebsite).toHaveAttribute("aria-label", "More, selected");

    await page.goto(`${tenantWebBase()}/follow-up`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    const followUpTab = tabs.getByRole("link", { name: /Follow-up/ });
    await expect(followUpTab).toHaveAttribute("aria-current", "page");
    await expect(followUpTab).toHaveAttribute("aria-label", "Follow-up, selected");
    await expect(followUpTab).toHaveAttribute("href", "/follow-up");

    await page.goto(`${tenantWebBase()}/dashboard`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    const more = tabs.getByRole("button", { name: /^More$/ });
    await more.click();
    const sheet = page.getByRole("dialog", { name: "Cohestra" });
    await expect(sheet).toBeVisible();
    const moreDest = page.getByRole("navigation", { name: "More destinations" });
    await expect(moreDest.getByRole("link")).toHaveText([
      "Analytics",
      "Cohestra AI",
      "Website",
      "Campaigns",
    ]);
    await expect(sheet.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(0);
    await expect(sheet.getByRole("link", { name: "Clients", exact: true })).toHaveCount(0);
    await expect(sheet.getByRole("link", { name: "Follow-up", exact: true })).toHaveCount(0);
    await expect(sheet.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Team", exact: true })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Calendar" })).toBeVisible();

    await page.keyboard.press("Tab");
    const focusedInside = await page.evaluate(() => {
      const dialog = document.querySelector("[role='dialog']");
      return Boolean(dialog?.contains(document.activeElement));
    });
    expect(focusedInside).toBe(true);
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(more).toBeFocused();

    await more.click();
    await sheet.getByRole("button", { name: "Calendar" }).click();
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "Activity calendar" })).toBeVisible();
    await page.getByRole("button", { name: "Close calendar" }).click();
    await expect(page.getByRole("dialog", { name: "Activity calendar" })).toHaveCount(0);

    await expect(page.getByRole("button", { name: /Calendar/ })).toHaveCount(0);

    await page.goto(`${tenantWebBase()}/clients`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "fab-clients-390x844.png"),
      fullPage: false,
    });

    await page.goto(`${tenantWebBase()}/activities`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "fab-activities-390x844.png"),
      fullPage: false,
    });

    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto(`${tenantWebBase()}/dashboard`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(dock(page)).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "dock-430x932.png"),
      fullPage: false,
    });

    await page.setViewportSize({ width: 767, height: 900 });
    await page.goto(`${tenantWebBase()}/dashboard`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(dock(page)).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Admin navigation" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Calendar/ })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "breakpoint-767.png"),
      fullPage: false,
    });

    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto(`${tenantWebBase()}/dashboard`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(dock(page)).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Admin navigation" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /Calendar/ })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "breakpoint-768.png"),
      fullPage: false,
    });
  });
});
