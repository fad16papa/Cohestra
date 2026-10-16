import { expect, test, type APIRequestContext } from "@playwright/test";

test.describe("45.6 Layer A real UAT recaptcha", () => {
  test("does not solve a live Google challenge", async ({ page }) => {
    const recaptchaConsole: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      if (
        /content security policy|refused to (load|frame|connect)|csp/i.test(text)
        && /recaptcha|gstatic|google\.com/i.test(text)
      ) {
        recaptchaConsole.push(text);
      }
      if (msg.type() === "error" && /recaptcha|invalid site key|error for site owner/i.test(text)) {
        recaptchaConsole.push(text);
      }
    });
    page.on("pageerror", (error) => {
      if (/recaptcha|invalid site key/i.test(error.message)) {
        recaptchaConsole.push(error.message);
      }
    });

    const response = await page.goto("/signup", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const widget = page.locator("iframe[src*='recaptcha']");
    const script = page.locator("script[src*='recaptcha'], script[data-recaptcha='true']");

    await expect(script.first()).toBeAttached({ timeout: 15_000 });
    await expect(widget.first()).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(/error for site owner|invalid site key|not in the list of supported domains/i),
    ).toHaveCount(0);
    await expect(page.getByText(/CAPTCHA is not configured|Could not load CAPTCHA/i)).toHaveCount(0);
    expect(recaptchaConsole, recaptchaConsole.join("\n")).toEqual([]);
  });

  test("empty CAPTCHA token is rejected", async ({ request, viewport }) => {
    test.skip(viewport?.width !== 1440, "one bounded empty-token probe per deploy");
    const response = await postSignup(request, { captchaToken: null });
    const body = await response.text();
    expect(response.status(), body).toBe(400);
    expect(body).toMatch(/CAPTCHA/i);
  });

  test("invalid CAPTCHA token is rejected", async ({ request, viewport }) => {
    test.skip(viewport?.width !== 1440, "one bounded invalid-token probe per deploy");
    const response = await postSignup(request, { captchaToken: "19-3-invalid-not-a-google-token" });
    const body = await response.text();
    expect(response.status(), body).toBe(400);
    expect(body).toMatch(/CAPTCHA/i);
  });
});

async function postSignup(
  request: APIRequestContext,
  opts: { captchaToken: string | null },
) {
  const id = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  return request.post("/api/v1/public/signup", {
    data: {
      acceptTermsAndPrivacy: true,
      termsVersion: "2026-07-21",
      privacyVersion: "2026-07-21",
      orgName: "Layer A Negative",
      slug: `la${id}`.slice(0, 14),
      email: `layer-a-${id}@example.com`,
      password: "ChangeMe123!",
      captchaToken: opts.captchaToken,
    },
  });
}
