import fs from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

import {
  PX2_BASIC_TENANT,
  PX2_CORE_TENANT,
  PX2_PRO_MEMBER,
  loginOwnedTenant,
} from "./helpers/e2e-owned-fixtures";
import { resolveE2eApiBase, tenantApiHost, tenantWebOrigin } from "./helpers/owned-fixture-data";
import {
  loginOperatorSession,
  seedOperatorAuthSession,
  tenantWebBase,
  waitForOperatorWorkspace,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-41-3"
);

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "767x900", width: 767, height: 900 },
  { name: "430x932", width: 430, height: 932 },
  { name: "390x844", width: 390, height: 844 },
] as const;

type AxeViolation = {
  id: string;
  impact: string | null;
  description: string;
};

const CAMPAIGN_ID = "11111111-2222-4333-8444-555555555555";

function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function fixtureCampaign(overrides: Record<string, unknown> = {}) {
  return {
    id: CAMPAIGN_ID,
    subject: "Harbourline October note",
    body: "<p>Hello neighbours</p>",
    bodyFormat: "html",
    sentAt: "2026-10-04T08:00:00.000Z",
    sentCount: 2,
    failedCount: 1,
    skippedCount: 1,
    status: "completed",
    results: [
      {
        clientId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee1",
        fullName: "Ada Sent",
        email: "ada@example.com",
        status: "sent",
        failureReason: null,
      },
      {
        clientId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee2",
        fullName: "Ben Failed",
        email: "ben@example.com",
        status: "failed",
        failureReason: "Mailbox rejected",
      },
      {
        clientId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee3",
        fullName: "Cara Skipped",
        email: null,
        status: "skipped",
        failureReason: "No email on file",
      },
    ],
    ...overrides,
  };
}

function fixtureList(items: unknown[] = [fixtureCampaign()], totalCount = items.length) {
  return {
    items: items.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: row.id,
        subject: row.subject,
        sentAt: row.sentAt,
        sentCount: row.sentCount,
        failedCount: row.failedCount,
        skippedCount: row.skippedCount,
        status: row.status,
      };
    }),
    page: 1,
    pageSize: 25,
    totalCount,
  };
}

function fixturePreview(withEmailCount = 2) {
  return {
    totalCount: withEmailCount + 1,
    withEmailCount,
    withoutEmailCount: 1,
    withoutConsentCount: 0,
    communityWithEmailCount: withEmailCount,
    additionalWithEmailCount: 0,
    previewItems: [
      {
        id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee1",
        fullName: "Ada Sent",
        email: "ada@example.com",
        consentGiven: true,
        isAdditionalRecipient: false,
      },
    ],
  };
}

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

async function assertNoOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  expect(overflow, label).toBe(false);
}

async function assertAxe(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .exclude("[disabled]")
    .exclude('[aria-disabled="true"]')
    .exclude(".border-warn\\/30")
    .analyze();
  const blocking = (results.violations as AxeViolation[]).filter(
    (violation) =>
      (violation.impact === "serious" || violation.impact === "critical") &&
      [
        "color-contrast",
        "landmark-one-main",
        "page-has-heading-one",
        "bypass",
        "region",
        "link-name",
        "list",
        "listitem",
        "button-name",
      ].includes(violation.id)
  );
  expect(blocking, `${label}: ${JSON.stringify(blocking, null, 2)}`).toEqual([]);
}

async function blockRealSends(page: Page): Promise<{ send: number; test: number }> {
  const counts = { send: 0, test: 0 };
  await page.route("**/api/v1/admin/campaigns/send-test", async (route) => {
    counts.test += 1;
    await json(route, { success: true, failureReason: null });
  });
  await page.route("**/api/v1/admin/campaigns/send", async (route) => {
    counts.send += 1;
    await json(route, {
      campaignId: CAMPAIGN_ID,
      subject: "Harbourline October note",
      sentAt: "2026-10-04T08:00:00.000Z",
      sentCount: 2,
      failedCount: 1,
      skippedCount: 1,
      status: "completed",
      results: fixtureCampaign().results,
    });
  });
  return counts;
}

async function stubComposeApis(page: Page, preview = fixturePreview(2)): Promise<void> {
  await page.route("**/api/v1/admin/communities", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await json(route, {
      items: [
        {
          id: "community-harbourline",
          name: "Harbourline",
          activityCount: 1,
          leadCount: 3,
          createdAt: "2026-10-01T00:00:00.000Z",
          updatedAt: "2026-10-01T00:00:00.000Z",
        },
      ],
    });
  });
  await page.route("**/api/v1/admin/campaigns/segment/preview", async (route) => {
    await json(route, preview);
  });
}

test.describe("Story 41.3 — Campaigns room", () => {
  test("Basic and Core admins stay locked and never send", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const sendCounts = await blockRealSends(page);
    const basic = await loginOwnedTenant(request, PX2_BASIC_TENANT);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, basic, "/campaigns", tenantWebOrigin(PX2_BASIC_TENANT.slug));
    await expect(page.getByRole("heading", { name: "Campaigns", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: /email campaigns are a pro craft/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /start pro trial/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send campaign" })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "basic-lock-1440.png"),
      fullPage: true,
    });

    await page.goto(`${tenantWebOrigin(PX2_BASIC_TENANT.slug)}/campaigns/new`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: /email campaigns are a pro craft/i })).toBeVisible();

    const core = await loginOwnedTenant(request, PX2_CORE_TENANT);
    await openAuthed(page, core, "/campaigns", tenantWebOrigin(PX2_CORE_TENANT.slug));
    await expect(page.getByRole("heading", { name: /email campaigns are a pro craft/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /start pro trial/i })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "core-lock-1440.png"),
      fullPage: true,
    });
    expect(sendCounts.send, "Basic/Core must not POST /send").toBe(0);
    expect(sendCounts.test, "Basic/Core must not POST /send-test").toBe(0);
  });

  test("Pro admin list states and Pro member has no checkout", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    await blockRealSends(page);

    const admin = await loginOperatorSession(request);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.route("**/api/v1/admin/campaigns?**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await json(route, fixtureList([]));
    });
    await openAuthed(page, admin, "/campaigns");
    await expect(page.getByRole("heading", { name: "Campaigns", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No campaigns sent yet" })).toBeVisible();
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "list-empty-1440.png"),
      fullPage: true,
    });
    await page.unroute("**/api/v1/admin/campaigns?**");

    await page.route("**/api/v1/admin/campaigns?**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await json(route, fixtureList([fixtureCampaign()]));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page.getByText("Completed")).toBeVisible();
    await expect(page.getByText("2 sent · 1 failed · 1 skipped")).toBeVisible();
    await expect(page.getByRole("heading", { name: /upgrade|unlock/i })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "pro-list-1440.png"),
      fullPage: true,
    });
    await page.unroute("**/api/v1/admin/campaigns?**");

    await page.route("**/api/v1/admin/campaigns?**", async (route) => {
      await json(route, { detail: "Campaigns unavailable." }, 500);
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: "Could not load campaigns" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /upgrade/i })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "list-error-1440.png"),
      fullPage: true,
    });
    await page.unroute("**/api/v1/admin/campaigns?**");

    await page.route("**/api/v1/admin/campaigns?**", async (route) => {
      await json(route, { detail: "Your role cannot open Campaigns." }, 403);
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: "You don’t have access to Campaigns" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /email campaigns are a pro craft/i })).toHaveCount(0);
    await page.unroute("**/api/v1/admin/campaigns?**");

    const member = await loginOwnedTenant(request, PX2_PRO_MEMBER);
    await openAuthed(page, member, "/campaigns");
    await expect(page.getByRole("heading", { name: "Campaigns", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /start pro trial/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /billing\/checkout/i })).toHaveCount(0);
  });

  test("unknown plan stays pending without a checkout SKU", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(120_000);
    await blockRealSends(page);
    const session = await loginOperatorSession(request);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route("**/api/v1/admin/shell**", async (route) => {
      const response = await route.fetch();
      const raw = (await response.json()) as Record<string, unknown>;
      raw.plan = "FuturePlan";
      raw.Plan = "FuturePlan";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(raw),
      });
    });
    await openAuthed(page, session, "/campaigns");
    await expect(page.getByRole("heading", { name: "Campaigns", level: 1 })).toBeVisible();
    await expect(page.getByText(/checking campaign access/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /start pro trial/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /email campaigns are a pro craft/i })).toHaveCount(0);
    await page.unroute("**/api/v1/admin/shell**");
  });

  test("compose at 390, dirty state, preview, QR, and send confirmation", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(240_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const sendCounts = await blockRealSends(page);
    await stubComposeApis(page);
    const session = await loginOperatorSession(request);

    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthed(page, session, "/campaigns/new");
    await expect(page.getByRole("heading", { name: "Compose campaign", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recipients" })).toBeVisible();
    await expect(page.getByLabel("Subject")).toBeVisible();
    await expect(page.getByRole("button", { name: "Preview" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send campaign" })).toBeVisible();
    await assertNoOverflow(page, "compose 390 overflow");
    const sendBox = await page.getByRole("button", { name: "Send campaign" }).boundingBox();
    expect(sendBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "compose-390.png"),
      fullPage: true,
    });

    await page.getByLabel("Subject").fill("October community note");
    await expect(page.getByText(/unsaved draft/i)).toBeVisible();
    await page.locator('[contenteditable="true"]').first().click();
    await page.keyboard.type("Hello Harbourline neighbours.");

    await page.getByLabel("Target community").selectOption("Harbourline");
    await expect(page.getByText("2 ready to send")).toBeVisible();
    await expect(page.getByText(/ready to send to/i)).toBeVisible();

    const previewButton = page.getByRole("button", { name: "Preview" });
    await previewButton.click();
    const preview = page.getByRole("dialog", { name: "Email preview" });
    await expect(preview).toBeVisible();
    await expect(preview.getByText(/will receive/i)).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "preview-390.png"),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(preview).toHaveCount(0);
    await expect(previewButton).toBeFocused();

    const qrTrigger = page.getByRole("button", { name: "Insert activity QR" });
    await qrTrigger.click();
    const qr = page.getByRole("dialog", { name: "Insert activity QR code" });
    await expect(qr).toBeVisible();
    await expect(page.getByLabel("Search activities")).toBeFocused();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "qr-390.png"),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(qr).toHaveCount(0);
    await expect(qrTrigger).toBeFocused();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "compose-1440.png"),
      fullPage: true,
    });

    const sendButton = page.getByRole("button", { name: "Send campaign" });
    await sendButton.click();
    const confirm = page.getByRole("alertdialog", { name: "Send this campaign?" });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByText(/cannot be undone/i)).toBeVisible();
    await expect(confirm.getByText(/consented client/i)).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "send-confirm-1440.png"),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(confirm).toHaveCount(0);
    await expect(sendButton).toBeFocused();

    await sendButton.click();
    await expect(page.getByRole("alertdialog", { name: "Send this campaign?" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    expect(sendCounts.send).toBe(0);

    await sendButton.click();
    await page.getByRole("button", { name: "Send campaign" }).last().click();
    await expect(
      page
        .locator("#main-content")
        .getByRole("status")
        .filter({ hasText: "Partial result: 2 sent, 1 failed, 1 skipped." })
    ).toBeVisible({
      timeout: 15_000,
    });
    expect(sendCounts.send).toBe(1);
    await expect(page.getByText("Partial or failed result")).toBeVisible();
    const pageSend = page.locator("#main-content").getByRole("button", { name: "Send campaign" });
    await pageSend.click();
    await expect(page.getByRole("alertdialog", { name: "Send this campaign?" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    expect(sendCounts.send).toBe(1);
  });

  test("async queued, partial results, safe HTML, and tenant denial", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    await blockRealSends(page);
    const session = await loginOperatorSession(request);

    let detailReads = 0;
    await page.route(`**/api/v1/admin/campaigns/${CAMPAIGN_ID}`, async (route) => {
      detailReads += 1;
      if (detailReads < 2) {
        await json(route, fixtureCampaign({ status: "queued", sentCount: 0, failedCount: 0 }));
        return;
      }
      await json(
        route,
        fixtureCampaign({
          status: "completed",
          body: `<p>Hello</p><script>window.__campaignXss=1</script><a href="javascript:alert(1)">bad</a><img src=x onerror="window.__campaignXss=1">`,
        })
      );
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, `/campaigns/${CAMPAIGN_ID}`);
    await expect(page.getByRole("status").filter({ hasText: /delivery is still queued/i })).toBeVisible();
    await expect(page.getByText("Partial result: 2 sent, 1 failed, 1 skipped.")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Sent", { exact: true })).toBeVisible();
    await expect(page.getByText("Failed", { exact: true })).toBeVisible();
    await expect(page.getByText("Skipped", { exact: true })).toBeVisible();
    const xss = await page.evaluate(() => (window as Window & { __campaignXss?: number }).__campaignXss);
    expect(xss).toBeUndefined();
    await expect(page.getByRole("link", { name: "bad" })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "partial-detail-1440.png"),
      fullPage: true,
    });

    const basic = await loginOwnedTenant(request, PX2_BASIC_TENANT);
    const cross = await request.get(`${resolveE2eApiBase()}/api/v1/admin/campaigns/${CAMPAIGN_ID}`, {
      headers: {
        Authorization: `Bearer ${basic.accessToken}`,
        Host: tenantApiHost(PX2_BASIC_TENANT.slug),
      },
    });
    expect([401, 403, 404]).toContain(cross.status());
    if (cross.status() === 200) {
      const body = await cross.text();
      expect(body.includes("Harbourline October note")).toBe(false);
    }
  });

  test("zero-recipient compose, viewports, dark, forced colors, and reduced motion", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(240_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    await blockRealSends(page);
    await stubComposeApis(page, fixturePreview(0));
    await page.route("**/api/v1/admin/campaigns?**", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await json(route, fixtureList([fixtureCampaign()]));
    });
    const session = await loginOperatorSession(request);

    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthed(page, session, "/campaigns/new");
    await page.getByLabel("Subject").fill("Zero recipient draft");
    await page.locator('[contenteditable="true"]').first().click();
    await page.keyboard.type("Draft body for zero recipients.");
    await page.getByLabel("Target community").selectOption("Harbourline");
    await expect(page.getByText("0 ready to send")).toBeVisible();
    await expect(page.getByText(/no matching clients have both consent/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Send campaign" })).toBeDisabled();

    await page.goto(`${tenantWebBase()}/campaigns`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: "Campaigns", level: 1 })).toBeVisible();

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expect(page.getByRole("heading", { name: "Campaigns", level: 1 })).toBeVisible();
      await assertNoOverflow(page, `${viewport.name} overflow`);
      await page.screenshot({
        path: path.join(evidenceDir, "viewports", `list-${viewport.name}.png`),
        fullPage: true,
      });
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await assertAxe(page, "campaigns list light");

    await page.getByRole("button", { name: /appearance:/i }).click();
    await page.getByRole("radio", { name: /^dark$/i }).click();
    await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 15_000 });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("radio", { name: /^dark$/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Campaigns", level: 1 })).toBeVisible();
    await assertAxe(page, "campaigns list dark");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "list-dark-1440.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: /appearance:/i }).click();
    await page.getByRole("radio", { name: /^light$/i }).click();
    await page.keyboard.press("Escape");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: "Campaigns", level: 1 })).toBeVisible();
    await page.emulateMedia({ reducedMotion: "no-preference" });

    await page.emulateMedia({ forcedColors: "active" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: "Campaigns", level: 1 })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "list-forced-colors-1440.png"),
      fullPage: true,
    });
    await page.emulateMedia({ forcedColors: "none" });
  });
});
