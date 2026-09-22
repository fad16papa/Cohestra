import { expect, test } from "@playwright/test";

import {
  loginOperatorSession,
  seedOperatorAuthSession,
  tenantWebBase,
  waitForOperatorWorkspace,
} from "./helpers/registration-e2e-api";

test.describe("Story 38.1 — billing sync triggers", () => {
  test("fresh TenantAdmin routes do not POST billing/sync or emit billing 503s", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

    const session = await loginOperatorSession(request);
    const syncUrls: string[] = [];
    const billing503s: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes("/api/v1/admin/billing/sync")) {
        syncUrls.push(req.url());
      }
    });
    page.on("response", (res) => {
      if (res.status() === 503 && res.url().includes("/api/v1/admin/billing")) {
        billing503s.push(`${res.request().method()} ${res.url()}`);
      }
    });

    await seedOperatorAuthSession(page, session);
    const base = tenantWebBase();
    await page.goto(`${base}/dashboard`, { waitUntil: "networkidle" });
    if (page.url().includes("/login")) {
      await page.evaluate((stored) => {
        localStorage.setItem("auth_session", JSON.stringify(stored));
      }, session);
      await page.goto(`${base}/dashboard`, { waitUntil: "networkidle" });
    }
    await waitForOperatorWorkspace(page);
    await expect(page.locator("[data-admin-shell]")).toBeVisible();
    expect(syncUrls, "dashboard must not POST billing/sync").toEqual([]);
    expect(billing503s, "dashboard must not receive billing 503s").toEqual([]);

    await page.goto(`${base}/clients`, { waitUntil: "networkidle" });
    await waitForOperatorWorkspace(page);
    expect(syncUrls, "clients must not POST billing/sync").toEqual([]);
    expect(billing503s, "clients must not receive billing 503s").toEqual([]);

    await page.goto(`${base}/settings/billing`, { waitUntil: "networkidle" });
    await waitForOperatorWorkspace(page);
    const unavailable = page.getByText("Billing isn't configured in this environment", {
      exact: false,
    });
    const upgrade = page.getByText("Upgrade your workspace");
    await expect(unavailable.or(upgrade)).toBeVisible();
    expect(syncUrls, "Billing page must not POST billing/sync on ordinary visit").toEqual([]);
    expect(billing503s, "Billing page must not receive billing 503s").toEqual([]);
  });
});
