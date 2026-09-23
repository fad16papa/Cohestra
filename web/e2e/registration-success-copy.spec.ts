import { expect, test } from "@playwright/test";

import {
  provisionOwnedActivity,
} from "./helpers/e2e-owned-fixtures";
import { MARINA_LIKE_FORM_SCHEMA, SINGLE_PAGE_CENTERED_THEME } from "./helpers/owned-fixture-data";
import { loginOperatorSession, tenantWebBase } from "./helpers/registration-e2e-api";

test.describe("Public registration success copy", () => {
  test("renders You're registered! after a real submit", async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(60_000);
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

    const session = await loginOperatorSession(request);
    const owned = await provisionOwnedActivity(request, session, {
      ownerKey: "38-3-success",
      workerIndex: testInfo.workerIndex,
      theme: SINGLE_PAGE_CENTERED_THEME,
      formSchema: MARINA_LIKE_FORM_SCHEMA,
      publish: true,
    });

    await page.goto(`${tenantWebBase()}/register/${owned.slug}`, {
      waitUntil: "networkidle",
    });

    const fullName = page.getByRole("textbox", { name: /full name/i });
    await expect(fullName).toBeVisible({ timeout: 30_000 });

    const stamp = Date.now().toString();
    const phone = page.getByRole("textbox", { name: /phone/i });
    const email = page.getByRole("textbox", { name: /^email$/i });
    const consent = page.getByRole("checkbox", { name: /agree|consent/i });

    if (await phone.isVisible().catch(() => false)) {
      await phone.fill(`9${stamp.slice(-7)}`);
    }
    if (await email.isVisible().catch(() => false)) {
      await email.fill(`success-copy-${stamp}@example.com`);
    }
    if (await consent.isVisible().catch(() => false)) {
      await consent.check();
    }

    // Hydration can remount the public form after the first paint and wipe earlier fills.
    await fullName.fill("Ada Lovelace");
    await expect(fullName).toHaveValue("Ada Lovelace");

    await page.getByRole("button", { name: /join activity/i }).click();

    const heading = page.getByRole("heading", { name: "You're registered!" });
    await expect(heading).toBeVisible({ timeout: 30_000 });
    await expect(heading).toHaveText("You're registered!");
    await expect(page.locator("body")).not.toContainText("&apos;");
    await expect(page.getByRole("button", { name: /register another person/i })).toBeVisible();
  });
});
