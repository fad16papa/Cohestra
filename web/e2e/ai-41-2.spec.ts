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
  "../../_bmad-output/planning-artifacts/evidence/px2-41-2"
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

function fixtureBrief(overrides: Record<string, unknown> = {}) {
  return {
    generatedAt: "2026-10-04T08:00:00.000Z",
    timeZoneId: "Asia/Singapore",
    mode: "deterministic",
    insights: [
      {
        id: "follow-up-due",
        kind: "follow_up_due",
        priority: 1,
        title: "1 person is due for follow-up",
        whyItMatters: "A next-follow-up date is already set.",
        whatChanged: null,
        evidence: [
          { label: "People due", value: "1", href: "/clients?followUpDue=true" },
        ],
        recommendedAction: {
          label: "Open due follow-ups",
          href: "/clients?followUpDue=true",
        },
      },
    ],
    insufficientData: { isInsufficient: false, message: "" },
    ...overrides,
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

async function waitForAiContent(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: "Cohestra AI", level: 1 })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Loading Cohestra AI…")).toHaveCount(0, { timeout: 20_000 });
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
        "definition-list",
      ].includes(violation.id)
  );
  expect(blocking, `${label}: ${JSON.stringify(blocking, null, 2)}`).toEqual([]);
}

test.describe("Story 41.2 — Cohestra AI room", () => {
  test("landmarks, redirects, Dashboard Needs attention, and history", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/ai");
    await waitForAiContent(page);
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Cohestra AI", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: /upgrade|unlock/i })).toHaveCount(0);

    await page.goto(`${tenantWebBase()}/intelligence?source=nav`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await expect(page).toHaveURL(/\/ai(\?source=nav)?/, { timeout: 20_000 });
    expect(new URL(page.url()).pathname).toBe("/ai");
    expect(new URL(page.url()).searchParams.get("source")).toBe("nav");
    await waitForAiContent(page);

    await page.goto(`${tenantWebBase()}/needs-attention?from=dashboard`, {
      waitUntil: "domcontentloaded",
    });
    await waitForOperatorWorkspace(page);
    await expect(page).toHaveURL(/\/ai\?/, { timeout: 20_000 });
    expect(new URL(page.url()).pathname).toBe("/ai");
    expect(new URL(page.url()).searchParams.get("from")).toBe("dashboard");
    await waitForAiContent(page);

    await openAuthed(page, session, "/dashboard");
    await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
    const aiLink = page.getByRole("link", { name: /Cohestra AI/ }).first();
    await expect(aiLink).toHaveAttribute("href", "/ai");
    await aiLink.click();
    await waitForOperatorWorkspace(page);
    await expect(page).toHaveURL(/\/ai/);
    await waitForAiContent(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await waitForAiContent(page);
    await expect(page.getByRole("heading", { name: "Cohestra AI", level: 1 })).toBeVisible();
  });

  test("TenantMember can open the room and modes stay truthful", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const member = await loginOwnedTenant(request, PX2_PRO_MEMBER);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, member, "/ai");
    await waitForAiContent(page);
    await expect(page.getByRole("heading", { name: "Cohestra AI", level: 1 })).toBeVisible();
    await expect(page.getByText("Based on workspace rules and data.")).toBeVisible();
    await expect(page.getByText("Synthesized from the same grounded facts.")).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "ai-deterministic-1440.png"),
      fullPage: true,
    });

    await page.route("**/api/v1/admin/intelligence/brief**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          fixtureBrief({
            mode: "synthesized",
          })
        ),
      });
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await waitForAiContent(page);
    await expect(page.getByText("Synthesized from the same grounded facts.")).toBeVisible();
    await expect(page.getByTestId("intelligence-mode")).toHaveText("synthesized");
    await page.unroute("**/api/v1/admin/intelligence/brief**");
  });

  test("insufficient, error, denied, unsafe action, and fallback stay truthful", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.route("**/api/v1/admin/intelligence/brief**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          fixtureBrief({
            insights: [],
            insufficientData: {
              isInsufficient: true,
              message: "Not enough operational data yet. Publish an activity or record a registration.",
            },
          })
        ),
      });
    });
    await openAuthed(page, session, "/ai");
    await waitForAiContent(page);
    await expect(page.getByRole("heading", { name: "Not enough operational data yet" })).toBeVisible();
    await expect(page.getByText("This is not an empty success.")).toBeVisible();
    await expect(page.getByText("nothing needs attention")).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "ai-insufficient-1440.png"),
      fullPage: true,
    });
    await page.unroute("**/api/v1/admin/intelligence/brief**");

    await page.route("**/api/v1/admin/intelligence/brief**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Brief unavailable." }),
      });
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: "Cohestra AI", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cohestra AI could not load" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /upgrade|unlock/i })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "ai-error-1440.png"),
      fullPage: true,
    });
    await page.unroute("**/api/v1/admin/intelligence/brief**");

    await page.route("**/api/v1/admin/intelligence/brief**", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Your role cannot open Cohestra AI." }),
      });
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await expect(page.getByRole("heading", { name: "Cohestra AI", level: 1 })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "You don’t have access to Cohestra AI" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /upgrade|unlock/i })).toHaveCount(0);
    await page.unroute("**/api/v1/admin/intelligence/brief**");

    await page.route("**/api/v1/admin/intelligence/brief**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          fixtureBrief({
            insights: [
              {
                id: "unsafe-action",
                kind: "follow_up_due",
                priority: 1,
                title: "Review this safely",
                whyItMatters: "The action href is hostile.",
                whatChanged: null,
                evidence: [{ label: "People due", value: "1", href: "javascript:alert(1)" }],
                recommendedAction: {
                  label: "Leave the workspace",
                  href: "https://evil.test",
                },
              },
            ],
          })
        ),
      });
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await waitForAiContent(page);
    await expect(page.getByRole("heading", { name: "Review this safely" })).toBeVisible();
    await expect(page.getByTestId("unavailable-action")).toBeVisible();
    await expect(page.getByRole("link", { name: "Leave the workspace" })).toHaveCount(0);
    await page.getByText("Why this is true").click();
    await expect(page.getByText("People due")).toBeVisible();
    await expect(page.getByRole("link", { name: "1" })).toHaveCount(0);
    await page.unroute("**/api/v1/admin/intelligence/brief**");

    await page.route("**/api/v1/admin/intelligence/brief**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fixtureBrief({ mode: "deterministic" })),
      });
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await waitForAiContent(page);
    await expect(page.getByText("Based on workspace rules and data.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open due follow-ups" })).toHaveAttribute(
      "href",
      "/clients?followUpDue=true"
    );
    await page.getByRole("link", { name: "Open due follow-ups" }).click();
    await waitForOperatorWorkspace(page);
    await expect(page).toHaveURL(/\/clients/);
    await page.unroute("**/api/v1/admin/intelligence/brief**");
  });

  test("populated insights expose evidence and tenants stay isolated", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    const session = await loginOperatorSession(request);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/ai");
    await waitForAiContent(page);

    const insightHeadings = page.locator("article h2");
    if ((await insightHeadings.count()) > 0) {
      await expect(page.getByText("Why this is true").first()).toBeVisible();
      await page.getByText("Why this is true").first().click();
      await expect(page.locator("article dl dt").first()).toBeVisible();
      const action = page.locator("article a").first();
      if ((await action.count()) > 0) {
        const href = await action.getAttribute("href");
        expect(href).toMatch(/^\/(clients|activities|follow-up|analytics|dashboard|ai|reports)/);
      }
    } else {
      await expect(page.getByRole("heading", { name: "Not enough operational data yet" })).toBeVisible();
    }

    async function briefPayload(tenant: OwnedTenant): Promise<string> {
      const tenantSession = await loginOwnedTenant(request, tenant);
      const response = await request.get(`${resolveE2eApiBase()}/api/v1/admin/intelligence/brief`, {
        headers: {
          Authorization: `Bearer ${tenantSession.accessToken}`,
          Host: tenantApiHost(tenant.slug),
        },
      });
      expect(response.ok(), `${tenant.slug} brief ${response.status()}`).toBeTruthy();
      return response.text();
    }

    const defaultBody = await briefPayload(DEFAULT_PRO_TENANT);
    const basicBody = await briefPayload(PX2_BASIC_TENANT);
    const defaultIds = [...defaultBody.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)].map(
      (match) => match[0]
    );
    for (const id of defaultIds) {
      expect(basicBody.includes(id), `Basic brief must not contain Pro id ${id}`).toBe(false);
    }
  });

  test("viewports, keyboard, axe, dark, forced colors, and reduced motion", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(240_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    const session = await loginOperatorSession(request);

    await page.route("**/api/v1/admin/intelligence/brief**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fixtureBrief()),
      });
    });

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openAuthed(page, session, "/ai");
      await waitForAiContent(page);
      await expect(page.getByRole("heading", { name: "Cohestra AI", level: 1 })).toBeVisible();
      await assertNoOverflow(page, `${viewport.name} overflow`);

      const action = page.getByRole("link", { name: "Open due follow-ups" });
      await expect(action).toBeVisible();
      const box = await action.boundingBox();
      expect(box, `${viewport.name} action`).toBeTruthy();
      expect(box!.height, `${viewport.name} action height`).toBeGreaterThanOrEqual(44);

      const shotName =
        viewport.width === 390
          ? "ai-390.png"
          : viewport.width === 768
            ? "ai-768.png"
            : viewport.width === 1024
              ? "ai-1024.png"
              : viewport.width === 1440
                ? "ai-1440.png"
                : null;
      if (shotName) {
        await page.screenshot({
          path: path.join(evidenceDir, "viewports", shotName),
          fullPage: true,
        });
      }
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await openAuthed(page, session, "/ai");
    await waitForAiContent(page);
    await page.keyboard.press("Tab");
    await page.locator("summary").first().focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("People due")).toBeVisible();
    await assertAxe(page, "ai light");

    await page.getByRole("button", { name: /appearance|theme|account/i }).first().click().catch(() => undefined);
    const darkRadio = page.getByRole("radio", { name: /dark/i });
    if ((await darkRadio.count()) > 0) {
      await darkRadio.click();
      await expect(darkRadio).toHaveCount(0, { timeout: 5_000 }).catch(() => undefined);
      await page.keyboard.press("Escape");
    }
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
    });
    await waitForAiContent(page);
    await assertAxe(page, "ai dark");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "ai-dark-1440.png"),
      fullPage: true,
    });

    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await waitForAiContent(page);
    await assertAxe(page, "ai forced-colors");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "ai-forced-colors-1440.png"),
      fullPage: true,
    });
    await page.unroute("**/api/v1/admin/intelligence/brief**");
  });
});
