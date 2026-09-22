import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import {
  loginOperatorSession,
  seedOperatorAuthSession,
  tenantWebBase,
  waitForOperatorWorkspace,
  type OperatorSession,
} from "./helpers/registration-e2e-api";

const API_BASE =
  process.env.E2E_API_BASE_URL ??
  process.env.PUBLIC_BASE_URL ??
  "http://localhost:8080";
const BASIC_EMAIL =
  process.env.E2E_BASIC_EMAIL ?? "px2-basic-admin@cohestra.local";
const BASIC_PASSWORD = process.env.E2E_BASIC_PASSWORD ?? "ChangeMe123!";
const BASIC_SLUG = process.env.E2E_BASIC_SLUG ?? "px2-basic";

function apiHostForSlug(slug: string): string {
  try {
    const url = new URL(API_BASE);
    return `${slug}.localhost${url.port ? `:${url.port}` : ""}`;
  } catch {
    return `${slug}.localhost`;
  }
}

function webBaseForSlug(slug: string): string {
  const configured = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
  const url = new URL(configured);
  url.hostname = `${slug}.localhost`;
  return url.origin;
}

async function loginTenantSession(
  request: APIRequestContext,
  email: string,
  password: string,
  slug: string
): Promise<OperatorSession> {
  const response = await request.post(`${API_BASE}/api/v1/auth/login`, {
    data: { email, password },
    headers: { Host: apiHostForSlug(slug) },
  });
  if (!response.ok()) {
    throw new Error(`Login failed for ${email}@${slug}: ${response.status()} ${await response.text()}`);
  }
  const body = (await response.json()) as {
    accessToken?: string;
    refreshToken?: string;
    expiresInSeconds?: number;
    ExpiresInSeconds?: number;
    expiresIn?: number;
  };
  if (!body.accessToken || !body.refreshToken) {
    throw new Error("Login response missing tokens");
  }
  const expiresInSec =
    body.expiresInSeconds ?? body.ExpiresInSeconds ?? body.expiresIn ?? 3600;
  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    expiresAt: Date.now() + expiresInSec * 1000,
  };
}

async function openWebsite(
  page: Page,
  session: OperatorSession,
  base: string
): Promise<void> {
  await seedOperatorAuthSession(page, session);
  await page.goto(`${base}/dashboard/website`, { waitUntil: "networkidle" });
  if (page.url().includes("/login")) {
    await page.evaluate((stored) => {
      localStorage.setItem("auth_session", JSON.stringify(stored));
    }, session);
    await page.goto(`${base}/dashboard/website`, { waitUntil: "networkidle" });
  }
  await waitForOperatorWorkspace(page);
}

test.describe("Story 38.2 — Website entitlement", () => {
  test("Pro TenantAdmin Website loads the editor and GET /admin/site is 200", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

    const siteStatus: number[] = [];
    const pageErrors: string[] = [];
    page.on("response", (res) => {
      if (res.url().includes("/api/v1/admin/site") && res.request().method() === "GET") {
        siteStatus.push(res.status());
      }
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    const session = await loginOperatorSession(request);
    await openWebsite(page, session, tenantWebBase());

    await expect(page.locator("#website-builder-toolbar")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /upgrade/i })).toHaveCount(0);
    expect(siteStatus, "entitled Website GET must succeed").toContain(200);
    expect(siteStatus.some((status) => status >= 500)).toBe(false);
    expect(pageErrors).toEqual([]);

    const direct = await request.get(`${API_BASE}/api/v1/admin/site`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Host: apiHostForSlug("default"),
      },
    });
    expect(direct.status()).toBe(200);
  });

  test("Basic TenantAdmin Website shows UpgradePanel and API is plan_locked 403", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

    let session: OperatorSession;
    try {
      session = await loginTenantSession(request, BASIC_EMAIL, BASIC_PASSWORD, BASIC_SLUG);
    } catch (error) {
      test.skip(true, `Basic fixture ${BASIC_EMAIL} @ ${BASIC_SLUG} unavailable: ${String(error)}`);
      return;
    }

    const siteGets: Array<{ status: number; url: string }> = [];
    const pageErrors: string[] = [];
    page.on("response", (res) => {
      if (res.url().includes("/api/v1/admin/site")) {
        siteGets.push({ status: res.status(), url: res.url() });
      }
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await openWebsite(page, session, webBaseForSlug(BASIC_SLUG));

    await expect(page.getByRole("heading", { name: /unlock a branded public homepage/i })).toBeVisible();
    await expect(page.getByText(/core/i).first()).toBeVisible();
    await expect(page.locator("#website-builder-toolbar")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /try again/i })).toHaveCount(0);
    await expect(page.getByText(/an unexpected error occurred/i)).toHaveCount(0);
    await expect(page.getByText(/could not load website builder/i)).toHaveCount(0);

    expect(
      siteGets.filter((item) => item.status >= 500),
      "Basic Website must never see a 500 from /admin/site"
    ).toEqual([]);
    expect(pageErrors).toEqual([]);

    const direct = await request.get(`${API_BASE}/api/v1/admin/site`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Host: apiHostForSlug(BASIC_SLUG),
      },
    });
    expect(direct.status()).toBe(403);
    const body = (await direct.json()) as {
      errorCode?: string;
      feature?: string;
      requiredPlan?: string;
      detail?: string;
    };
    expect(body.errorCode).toBe("plan_locked");
    expect(body.feature).toBe("website");
    expect(body.requiredPlan).toBe("Core");
    expect(body.detail ?? "").toMatch(/Core/i);
  });
});
