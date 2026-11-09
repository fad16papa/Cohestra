import { expect, test } from "@playwright/test";

import { resolveUatWorkspaceOrigin } from "../lib/uat-workspace-origin";
import { mailboxSecretsPresent, readSignupOtp } from "./otp-mailbox";

const email = process.env.UAT_AUTO_BASIC_EMAIL ?? "";
const password = process.env.UAT_AUTO_BASIC_PASSWORD ?? "";
const basicSlug = process.env.UAT_AUTO_BASIC_SLUG?.trim() || "default";
const mailboxAddress =
  process.env.UAT_OTP_MAILBOX_ADDRESS ?? process.env.UAT_OTP_MAILBOX_USER ?? "";

function workspaceOrigin(slug: string): string {
  const base = process.env.UAT_PUBLIC_BASE_URL ?? "";
  if (!base) {
    throw new Error("UAT_PUBLIC_BASE_URL is required");
  }
  return resolveUatWorkspaceOrigin(base, slug);
}

function isSettledWorkspaceUrl(url: URL): boolean {
  const path = url.pathname;
  const onWorkspace =
    path === "/dashboard"
    || path.startsWith("/dashboard/")
    || path === "/platform"
    || path.startsWith("/platform/");
  return onWorkspace && !url.searchParams.has("handoff");
}

test.describe("45.4 authenticated UAT", () => {
  test("dedicated automation login when credentials exist", async ({ page }) => {
    if (!email || !password) {
      throw new Error(
        "UAT_AUTO_BASIC_EMAIL/PASSWORD are required; authenticated coverage cannot skip",
      );
    }
    const origin = workspaceOrigin(basicSlug);
    const response = await page.goto(`${origin}/login`, { waitUntil: "networkidle" });
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    const submit = page.getByRole("button", { name: /sign in to workspace/i });
    await expect(submit).toBeEnabled();
    await page.locator("form").evaluate((form) => {
      form.setAttribute("method", "post");
    });
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await submit.click();
    await page.waitForURL(isSettledWorkspaceUrl, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Sign in" })).toHaveCount(0);
    expect(new URL(page.url()).origin).toBe(origin);
  });
});

test.describe("45.5 OTP mailbox", () => {
  test("signup OTP is read from the dedicated mailbox when configured", async ({ page }) => {
    test.skip(
      !mailboxSecretsPresent() || !mailboxAddress,
      "dedicated UAT OTP mailbox secrets are not configured",
    );

    const signupEmail = mailboxAddress;

    const response = await page.goto("/signup", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await page.getByLabel(/email/i).fill(signupEmail);
    const submit = page.getByRole("button", { name: /create|start|continue|sign up/i }).first();
    if (await submit.isVisible()) {
      await submit.click();
    }

    const otp = readSignupOtp({
      to: signupEmail,
      subject: "Verify your Cohestra account",
    });
    expect(otp).toMatch(/^\d{6}$/);

    const otpField = page.getByLabel(/code|otp|verification/i).first();
    if (await otpField.isVisible()) {
      await otpField.fill(otp);
    }
  });
});
