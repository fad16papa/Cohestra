import { expect, test } from "@playwright/test";

import {
  DEFAULT_PRO_TENANT,
  PX2_BASIC_TENANT,
  fetchTenantPlan,
  loginOwnedTenant,
  snapshotCanonicalDemos,
} from "./helpers/e2e-owned-fixtures";
import { tenantWebOrigin } from "./helpers/owned-fixture-data";
import { loginOperatorSession } from "./helpers/registration-e2e-api";

test.describe("Story 38.3 — tenant and theme isolation", () => {
  test("Basic and Pro fixtures return their intended plan via API", async ({ request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

    const pro = await loginOwnedTenant(request, DEFAULT_PRO_TENANT);
    const basic = await loginOwnedTenant(request, PX2_BASIC_TENANT);

    expect(await fetchTenantPlan(request, pro, DEFAULT_PRO_TENANT.slug)).toBe("Pro");
    expect(await fetchTenantPlan(request, basic, PX2_BASIC_TENANT.slug)).toBe("Basic");
  });

  test("Basic and Pro fixtures show their intended plan in the admin shell", async ({
    page,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

    await page.goto(`${tenantWebOrigin(DEFAULT_PRO_TENANT.slug)}/login`, {
      waitUntil: "networkidle",
    });
    await page.getByLabel("Email address").fill(DEFAULT_PRO_TENANT.email);
    await page.getByLabel("Password", { exact: true }).fill(DEFAULT_PRO_TENANT.password);
    await page.getByRole("button", { name: /sign in to workspace/i }).click();
    await expect(page.getByText("Pro", { exact: true }).first()).toBeVisible({ timeout: 30_000 });

    await page.goto(`${tenantWebOrigin(PX2_BASIC_TENANT.slug)}/login`, {
      waitUntil: "networkidle",
    });
    await page.getByLabel("Email address").fill(PX2_BASIC_TENANT.email);
    await page.getByLabel("Password", { exact: true }).fill(PX2_BASIC_TENANT.password);
    await page.getByRole("button", { name: /sign in to workspace/i }).click();
    await expect(page.getByText("Basic", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  });

  test("canonical Marina/cinema/demo records remain unchanged across a snapshot", async ({
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

    const session = await loginOperatorSession(request);
    expect(await fetchTenantPlan(request, session, DEFAULT_PRO_TENANT.slug)).toBe("Pro");
    const first = await snapshotCanonicalDemos(request, session.accessToken);
    const second = await snapshotCanonicalDemos(request, session.accessToken);
    expect(second).toEqual(first);
    expect(first.map((item) => item.slug)).toEqual([
      "demo-marina-social-meetup",
      "demo-runners-draft-clinic",
      "demo-wellness-morning-yoga",
    ]);
    for (const item of first) {
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.status.length).toBeGreaterThan(0);
      expect(Object.keys(item.theme).sort()).toEqual([
        "accentColor",
        "designTokens",
        "flow",
        "heroDisplay",
        "heroImageUrl",
        "inheritCommunityBrand",
        "layout",
        "preset",
        "style",
      ]);
      expect(item.formSchema).toEqual(expect.objectContaining({ version: expect.anything() }));
    }
  });
});
