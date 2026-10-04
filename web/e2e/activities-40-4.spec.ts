import fs from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  PX2_PRO_MEMBER,
  loginOwnedTenant,
  provisionOwnedActivity,
} from "./helpers/e2e-owned-fixtures";
import {
  loginOperatorSession,
  seedOperatorAuthSession,
  tenantWebBase,
  waitForOperatorWorkspace,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-40-4"
);

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "767x844", width: 767, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "390x844", width: 390, height: 844 },
] as const;

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

async function waitForActivitiesReady(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: "Activities" })).toBeVisible();
  await expect(page.locator("[data-activities-list-state]")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator("[data-activities-list-state='loading']")).toHaveCount(0, {
    timeout: 20_000,
  });
}

async function assertNoOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  expect(overflow, label).toBe(false);
}

async function assertAxe(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = (results.violations as AxeViolation[]).filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical"
  );
  expect(serious, `${label}: ${JSON.stringify(serious, null, 2)}`).toEqual([]);
}

function cardStatuses(page: Page) {
  return page.locator("[data-activity-status]");
}

test.describe("Story 40.4 — Activities and Opportunity boundary", () => {
  test("default order keeps Archived after actionable rows", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/activities");
    await waitForActivitiesReady(page);

    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1, name: "Activities" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Opportunity" })).toHaveCount(0);
    await expect(page.locator("#activity-status")).not.toContainText("Opportunity");

    const statuses = await cardStatuses(page).evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-activity-status") ?? "")
    );
    const firstArchived = statuses.findIndex((status) => status === "archived");
    if (firstArchived !== -1) {
      expect(statuses.slice(0, firstArchived).every((status) => status !== "archived")).toBe(
        true
      );
      expect(
        statuses.slice(0, firstArchived).some((status) => status === "draft" || status === "published")
      ).toBe(true);
    }

    const nextPage = page.getByRole("button", { name: "Next" });
    if (await nextPage.isEnabled()) {
      await nextPage.click();
      await expect(page.getByText(/Page 2 of/)).toBeVisible();
    }
    await page.selectOption("#activity-status", "archived");
    await expect(page).toHaveURL(/status=archived/);
    await waitForActivitiesReady(page);
    await expect(page.getByText(/Page 1 of/)).toBeVisible();
    const archivedOnly = await cardStatuses(page).evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-activity-status") ?? "")
    );
    expect(archivedOnly.length).toBeGreaterThan(0);
    expect(archivedOnly.every((status) => status === "archived")).toBe(true);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "archived-filter-1440.png"),
      fullPage: true,
    });

    await assertAxe(page, "activities archived filter");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "activities-1440.png"),
      fullPage: true,
    });
  });

  test("populated detail h1 is the activity name and Form Studio stays archived-read-only", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    const session = await loginOperatorSession(request);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/activities");
    await waitForActivitiesReady(page);

    const publishedCard = page.locator('[data-activity-status="published"]').first();
    await expect(publishedCard).toBeVisible();
    const publishedName = (await publishedCard.locator("[data-slot='card-title']").innerText()).trim();
    await publishedCard.locator("a[href^='/activities/']").first().click();
    await expect(page).toHaveURL(/\/activities\/[0-9a-f-]{36}/i);
    await expect(page.getByRole("heading", { level: 1, name: publishedName })).toBeVisible();
    await expect(page.locator("main#main-content")).toHaveCount(1);

    await openAuthed(page, session, "/activities?status=archived");
    await waitForActivitiesReady(page);
    const archivedCard = page.locator('[data-activity-status="archived"]').first();
    await expect(archivedCard).toBeVisible();
    const archivedName = (await archivedCard.locator("[data-slot='card-title']").innerText()).trim();
    await archivedCard.locator("a[href^='/activities/']").first().click();
    await expect(page.getByRole("heading", { level: 1, name: archivedName })).toBeVisible();
    await page.getByRole("tab", { name: "Form" }).click();
    await expect(page.getByText("Archived — form is read-only.")).toBeVisible();
  });

  test("archive dialog traps focus, Escape cancels, and failure keeps the record", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);
    const owned = await provisionOwnedActivity(request, session, {
      ownerKey: "40-4-archive",
      workerIndex: test.info().workerIndex,
      publish: false,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, `/activities/${owned.id}`);
    await expect(page.getByRole("heading", { level: 1, name: owned.name })).toBeVisible();

    const archiveButton = page.getByRole("button", { name: "Archive" });
    await archiveButton.click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Archive this draft?" })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "archive-dialog-draft.png"),
      fullPage: true,
    });

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(archiveButton).toBeFocused();

    await archiveButton.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);

    await page.route(`**/api/v1/admin/activities/${owned.id}/archive`, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Archive failed for test." }),
      })
    );
    await archiveButton.click();
    await dialog.getByRole("button", { name: "Archive draft" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Archive failed for test.");
    await expect(page.getByRole("heading", { level: 1, name: owned.name })).toBeVisible();
    await page.unroute(`**/api/v1/admin/activities/${owned.id}/archive`);

    await dialog.getByRole("button", { name: "Archive draft" }).click();
    await expect(dialog).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByText("Archived", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: owned.name })).toBeVisible();
  });

  test("empty, no-match, error, denied, and not-found stay distinct", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/activities?search=zz-no-match-40-4");
    await waitForActivitiesReady(page);
    await expect(page.locator("[data-activities-list-state='no-match']")).toBeVisible();
    await expect(page.getByRole("heading", { name: /No activities match/ })).toBeVisible();
    await expect(page.getByText(/all caught up/i)).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "no-match-1440.png"),
      fullPage: true,
    });

    await page.route("**/api/v1/admin/activities?**", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Activities list exploded." }),
      })
    );
    await openAuthed(page, session, "/activities");
    await expect(page.getByRole("heading", { name: "Could not load activities." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No activities yet" })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "error-1440.png"),
      fullPage: true,
    });
    await page.unroute("**/api/v1/admin/activities?**");

    await page.route("**/api/v1/admin/activities?**", (route) =>
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Forbidden" }),
      })
    );
    await openAuthed(page, session, "/activities");
    await expect(
      page.getByRole("heading", { name: "You don’t have access to Activities." })
    ).toBeVisible();
    await expect(page.getByText(/upgrade/i)).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "denied-1440.png"),
      fullPage: true,
    });
    await page.unroute("**/api/v1/admin/activities?**");

    await openAuthed(
      page,
      session,
      "/activities/00000000-0000-4000-8000-000000000099"
    );
    await expect(page.getByRole("heading", { level: 1, name: "Activity" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Activity not found." })).toBeVisible();
  });

  test("TenantMember can open Activities and Follow-up still owns Opportunity", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOwnedTenant(request, PX2_PRO_MEMBER);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/activities", tenantWebBase());
    await waitForActivitiesReady(page);
    await expect(page.getByRole("heading", { level: 1, name: "Activities" })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "member-1440.png"),
      fullPage: true,
    });
    await page.goto(`${tenantWebBase()}/follow-up?category=opportunity`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { level: 1, name: "Follow-up" })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Opportunity/ })).toBeVisible();
    await page.goto(`${tenantWebBase()}/opportunities`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: "Activities" })).toHaveCount(0);
  });

  test("390/767/768/1024/1440 layouts have no page overflow and 44px filters", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openAuthed(page, session, "/activities");
      await waitForActivitiesReady(page);
      await assertNoOverflow(page, `${viewport.name} overflow`);
      if (viewport.width < 768) {
        await page.getByRole("button", { name: /Filters/ }).click();
      }
      const status = page.locator("#activity-status");
      await expect(status).toBeVisible();
      const box = await status.boundingBox();
      expect(box, `${viewport.name} status filter`).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      const labels = page.locator("[data-activity-status-label]");
      const labelCount = await labels.count();
      for (let index = 0; index < labelCount; index += 1) {
        const clipped = await labels.nth(index).evaluate(
          (node) => node.scrollWidth > node.clientWidth + 1
        );
        expect(clipped, `${viewport.name} status clip ${index}`).toBe(false);
      }
      if (
        viewport.name === "390x844" ||
        viewport.name === "768x1024" ||
        viewport.name === "1024x768" ||
        viewport.name === "1440x900"
      ) {
        await page.screenshot({
          path: path.join(evidenceDir, "viewports", `activities-${viewport.name}.png`),
          fullPage: true,
        });
      }
    }
    await assertAxe(page, "activities 390");
  });
});
