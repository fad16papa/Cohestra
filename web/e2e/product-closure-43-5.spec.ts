import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { MARKETING_COOKIE_CONSENT_KEY } from "../lib/marketing-cookie-consent";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-43-5"
);

async function seedConsentAndOpen(
  page: Page,
  stored: string | null,
  route = "/"
): Promise<void> {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, value }) => {
      try {
        if (value == null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, value);
        }
      } catch {
        // ignore
      }
    },
    { key: MARKETING_COOKIE_CONSENT_KEY, value: stored }
  );
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-cookie-consent]")).toHaveCount(1);
}

async function waitForConsentDecision(page: Page): Promise<void> {
  await expect(page.locator('[data-cookie-consent="hidden"]')).toHaveCount(1);
}

function cookieBanner(page: Page) {
  return page.getByRole("region", { name: "Cookie consent" });
}

async function expectCtaClearOfBanner(page: Page): Promise<void> {
  const banner = cookieBanner(page);
  await expect(banner).toBeVisible();
  const cta = page.getByRole("link", { name: "Start free" }).first();
  await expect(cta).toBeVisible();
  const ctaBox = await cta.boundingBox();
  const bannerBox = await banner.boundingBox();
  expect(ctaBox, "Start free box").toBeTruthy();
  expect(bannerBox, "banner box").toBeTruthy();
  if (!ctaBox || !bannerBox) {
    return;
  }
  const overlaps =
    ctaBox.y < bannerBox.y + bannerBox.height &&
    ctaBox.y + ctaBox.height > bannerBox.y &&
    ctaBox.x < bannerBox.x + bannerBox.width &&
    ctaBox.x + ctaBox.width > bannerBox.x;
  expect(overlaps, "Start free must not sit under the cookie banner").toBe(false);
  await expect(cta).toBeEnabled();
}

test.describe("Story 43.5 — product-wide closure", () => {
  test("register bootstrap copy reflects Team", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      /Create your workspace admin account/i
    );
    await expect(page.getByText(/invite teammates later/i)).toBeVisible();
    await expect(page.getByText(/one operator/i)).toHaveCount(0);
    await expect(page.getByText(/single operator/i)).toHaveCount(0);
  });

  test("390 first visit: banner visible, CTA clear, reject persists", async ({ page }) => {
    test.setTimeout(60_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await seedConsentAndOpen(page, null);
    await expectCtaClearOfBanner(page);
    await expect(page.getByRole("button", { name: "Accept" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reject non-essential" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Preferences" })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "marketing-cookie-390-first-visit.png"),
    });
    await page.getByRole("link", { name: "Start free" }).first().click();
    await expect(page).toHaveURL(/\/signup/);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-cookie-consent="visible"]')).toHaveCount(1);
    await expect(cookieBanner(page)).toBeVisible();
    await page.getByRole("button", { name: "Reject non-essential" }).click();
    await waitForConsentDecision(page);
    await expect(cookieBanner(page)).toHaveCount(0);
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      MARKETING_COOKIE_CONSENT_KEY
    );
    expect(stored).toBe("essential");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "marketing-cookie-390-rejected.png"),
    });
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await waitForConsentDecision(page);
    await expect(cookieBanner(page)).toHaveCount(0);
  });

  test("1440 first visit: banner visible and Accept persists", async ({ page }) => {
    test.setTimeout(60_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedConsentAndOpen(page, null);
    await expectCtaClearOfBanner(page);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "marketing-cookie-1440-first-visit.png"),
    });
    await page.getByRole("button", { name: "Accept" }).click();
    await waitForConsentDecision(page);
    await expect(cookieBanner(page)).toHaveCount(0);
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      MARKETING_COOKIE_CONSENT_KEY
    );
    expect(stored).toBe("accepted");
    await page.goto("/docs", { waitUntil: "domcontentloaded" });
    await waitForConsentDecision(page);
    await expect(cookieBanner(page)).toHaveCount(0);
  });

  test("390 Preferences uses the 38.6 dialog and does not preselect optional", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await seedConsentAndOpen(page, null);
    await page.getByRole("button", { name: "Preferences" }).click();
    const dialog = page.getByRole("dialog", { name: "Cookie preferences" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("checkbox", { name: /Essential cookies/i })).toBeDisabled();
    await expect(dialog.getByRole("checkbox", { name: /Optional analytics/i })).not.toBeChecked();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "marketing-cookie-390-preferences.png"),
    });
    await dialog.getByRole("button", { name: "Save choices" }).click();
    await waitForConsentDecision(page);
    await expect(cookieBanner(page)).toHaveCount(0);
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      MARKETING_COOKIE_CONSENT_KEY
    );
    expect(stored).toBe("essential");
  });

  test("accepted legacy value does not re-prompt", async ({ page }) => {
    await seedConsentAndOpen(page, "accepted");
    await waitForConsentDecision(page);
    await expect(cookieBanner(page)).toHaveCount(0);
  });

  test("leftover #crm hash still shows the cookie banner", async ({ page }) => {
    await seedConsentAndOpen(page, null, "/#crm");
    await waitForConsentDecision(page);
    await expect(cookieBanner(page)).toBeVisible();
  });
});
