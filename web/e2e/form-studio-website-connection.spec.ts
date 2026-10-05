import { expect, test } from "@playwright/test";

import {
  PX2_BASIC_TENANT,
  PX2_CORE_TENANT,
  loginOwnedTenant,
  openOwnedActivityTab,
  provisionOwnedActivity,
} from "./helpers/e2e-owned-fixtures";
import { loginOperatorSession, openActivityTab } from "./helpers/registration-e2e-api";

test.describe("Form Studio tenant website connection", () => {
  test("Pro operator sees optional website connection on Form tab", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    const session = await loginOperatorSession(request);
    const owned = await provisionOwnedActivity(request, session, {
      ownerKey: "website-link-pro",
      workerIndex: test.info().workerIndex,
    });
    await openActivityTab(page, owned.id, "form", session);

    await page.locator("#form-studio-tab-build").click();
    await expect(
      page.getByRole("heading", { name: /Tenant website link/i })
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("checkbox", { name: /Show link to my Cohestra website/i })
    ).toBeVisible();
    await expect(page.getByText(/Upgrade to Core/i)).toHaveCount(0);
  });

  test("Core operator sees optional website connection on Form tab", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    const session = await loginOwnedTenant(request, PX2_CORE_TENANT);
    const owned = await provisionOwnedActivity(request, session, {
      ownerKey: "website-link-core",
      workerIndex: test.info().workerIndex,
      tenant: PX2_CORE_TENANT,
    });
    await openOwnedActivityTab(page, owned, "form", session);

    await page.locator("#form-studio-tab-build").click();
    await expect(
      page.getByRole("heading", { name: /Tenant website link/i })
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("checkbox", { name: /Show link to my Cohestra website/i })
    ).toBeVisible();
  });

  test("Basic Form Studio omits website connection entirely", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    const session = await loginOwnedTenant(request, PX2_BASIC_TENANT);
    const owned = await provisionOwnedActivity(request, session, {
      ownerKey: "website-link-basic",
      workerIndex: test.info().workerIndex,
      tenant: PX2_BASIC_TENANT,
    });
    await openOwnedActivityTab(page, owned, "form", session);

    await page.locator("#form-studio-tab-build").click();
    await expect(page.getByRole("heading", { name: /Closed message/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: /Tenant website link/i })).toHaveCount(0);
    await expect(page.getByText(/Website connection/i)).toHaveCount(0);
    await expect(
      page.getByRole("checkbox", { name: /Show link to my Cohestra website/i })
    ).toHaveCount(0);
    await expect(page.getByText(/Upgrade to Core/i)).toHaveCount(0);
  });
});
