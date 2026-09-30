import fs from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  loginOperatorSession,
  seedOperatorAuthSession,
  tenantWebBase,
  waitForOperatorWorkspace,
  waitForReportsContent,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-39-1"
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

test.describe("Story 39.1 — desktop shell and canonical rooms", () => {
  test("rail order, redirects, footer, stubs, landmarks, axe", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(90_000);
    const session = await loginOperatorSession(request);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/dashboard");

    const rail = page.getByRole("navigation", { name: "Admin navigation" });
    await expect(rail).toHaveCount(1);
    const labels = await rail.getByRole("link").evaluateAll((links) =>
      links
        .map((link) => (link.textContent ?? "").replace(/\s+/g, " ").trim())
        .filter((label) => label.length > 0 && !label.startsWith("All activities"))
    );
    const primary = labels.filter((label) =>
      [
        "Dashboard",
        "Clients",
        "Activities",
        "Follow-up",
        "Analytics",
        "Cohestra AI",
        "Website",
        "Campaigns",
      ].includes(label)
    );
    expect(primary).toEqual([
      "Dashboard",
      "Clients",
      "Activities",
      "Follow-up",
      "Analytics",
      "Cohestra AI",
      "Website",
      "Campaigns",
    ]);

    await expect(rail.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page"
    );

    await page.goto(`${tenantWebBase()}/reports?preset=weekly`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await expect(page).toHaveURL(/\/analytics\?.*preset=weekly/);
    await waitForReportsContent(page);
    await expect(rail.getByRole("link", { name: "Analytics" })).toHaveAttribute(
      "aria-current",
      "page"
    );

    await page.goto(`${tenantWebBase()}/intelligence`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page).toHaveURL(/\/ai$/);
    await expect(page.getByRole("heading", { name: "Cohestra AI", level: 1 })).toHaveCount(1);
    await expect(rail.getByRole("link", { name: "Cohestra AI" })).toHaveAttribute(
      "aria-current",
      "page"
    );

    await page.goto(`${tenantWebBase()}/needs-attention`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page).toHaveURL(/\/ai$/);
    await expect(page.getByRole("heading", { name: "Cohestra AI", level: 1 })).toHaveCount(1);
    await expect(rail.getByRole("link", { name: "Cohestra AI" })).toHaveAttribute(
      "aria-current",
      "page"
    );

    await page.goto(`${tenantWebBase()}/follow-up`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: "Follow-up", level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(rail.getByRole("link", { name: "Follow-up" })).toHaveAttribute(
      "aria-current",
      "page"
    );

    await page.goto(`${tenantWebBase()}/dashboard/website`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await expect(page.getByText("Website Studio").first()).toBeVisible();
    await expect(rail.getByRole("link", { name: "Website" })).toHaveAttribute(
      "aria-current",
      "page"
    );

    await expect(page.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main-content"
    );
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    const sidebar = page.getByRole("complementary", { name: "Workspace" });
    await expect(sidebar.getByRole("link", { name: "Settings", exact: true })).toHaveAttribute(
      "href",
      "/settings/profile"
    );
    await expect(sidebar.getByRole("link", { name: "Team", exact: true })).toHaveAttribute(
      "href",
      "/settings/team"
    );
    await expect(sidebar.getByRole("link", { name: "Billing", exact: true })).toHaveAttribute(
      "href",
      "/settings/billing"
    );

    await page.goto(`${tenantWebBase()}/settings?section=account`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await expect(page).toHaveURL(/\/settings\/profile\?section=account/);
    await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toHaveCount(1);

    await page.goto(`${tenantWebBase()}/analytics`, { waitUntil: "domcontentloaded" });
    await waitForReportsContent(page);
    const axe = await new AxeBuilder({ page })
      .withRules(["landmark-one-main", "page-has-heading-one", "bypass", "duplicate-id"])
      .analyze();
    expect(axe.violations).toEqual([]);

    for (const viewport of [
      { name: "1440x900", width: 1440, height: 900 },
      { name: "1024x768", width: 1024, height: 768 },
      { name: "768x1024", width: 768, height: 1024 },
    ] as const) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`${tenantWebBase()}/dashboard`, { waitUntil: "domcontentloaded" });
      await waitForOperatorWorkspace(page);
      await page.screenshot({
        path: path.join(evidenceDir, "viewports", `rail-${viewport.name}.png`),
        fullPage: false,
      });
    }
  });
});
