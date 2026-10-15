import { expect, test } from "@playwright/test";
import { mailboxSecretsPresent, readSignupOtp } from "./otp-mailbox";

const email = process.env.UAT_AUTO_BASIC_EMAIL ?? "";
const password = process.env.UAT_AUTO_BASIC_PASSWORD ?? "";
const mailboxAddress =
  process.env.UAT_OTP_MAILBOX_ADDRESS ?? process.env.UAT_OTP_MAILBOX_USER ?? "";

test.describe("45.4 authenticated UAT", () => {
  test("dedicated automation login when credentials exist", async ({ page }) => {
    test.skip(!email || !password, "dedicated UAT automation credentials are not configured");
    const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign in|log in|continue/i }).click();
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 20_000 });
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
