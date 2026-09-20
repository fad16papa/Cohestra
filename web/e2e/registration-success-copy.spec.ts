import { expect, test } from "@playwright/test";

import {
  resolvePublishedE2eSlug,
  loginOperator,
  tenantWebBase,
} from "./helpers/registration-e2e-api";

test.describe("Public registration success copy", () => {
  test("renders You're registered! after a real submit", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

    const token = await loginOperator(request);
    const slug = await resolvePublishedE2eSlug(
      request,
      token,
      process.env.REGISTRATION_E2E_SLUG ?? "demo-marina-social-meetup"
    );

    await page.goto(`${tenantWebBase()}/register/${slug}`, {
      waitUntil: "domcontentloaded",
    });

    const fullName = page.getByLabel(/full name/i);
    await expect(fullName).toBeVisible({ timeout: 30_000 });
    await fullName.fill("Ada Lovelace");

    const phone = page.getByLabel(/^phone$/i);
    if (await phone.isVisible().catch(() => false)) {
      await phone.fill("91234567");
    }

    const email = page.getByLabel(/^email$/i);
    if (await email.isVisible().catch(() => false)) {
      await email.fill(`success-copy-${Date.now()}@example.com`);
    }

    const consent = page.getByRole("checkbox", { name: /agree|consent/i });
    if (await consent.isVisible().catch(() => false)) {
      await consent.check();
    }

    await page.getByRole("button", { name: /join activity/i }).click();

    const heading = page.getByRole("heading", { name: "You're registered!" });
    await expect(heading).toBeVisible({ timeout: 30_000 });
    await expect(heading).toHaveText("You're registered!");
    await expect(page.locator("body")).not.toContainText("&apos;");
    await expect(page.getByRole("button", { name: /register another person/i })).toBeVisible();
  });
});
