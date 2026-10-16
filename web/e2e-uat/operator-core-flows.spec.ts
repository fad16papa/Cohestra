import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Story 19.5 operator walks.
 *
 * UAT_AUTO_BASIC_* / UAT_AUTO_PRO_* are Environment `uat` aliases for
 * EXISTING isolated UAT TenantAdmins. They are not a requirement to
 * provision new users or mailboxes.
 *
 * Canonical 19.5 login is email/password on the tenant host.
 * Signup OTP (Epic 45.5 / Story 19.3) is out of scope here.
 * Do not suspend or archive `default` or `creativorare`.
 * Do not POST /api/v1/admin/campaigns/send (list blast). Test-send only.
 */

const basicEmail = process.env.UAT_AUTO_BASIC_EMAIL ?? "";
const basicPassword = process.env.UAT_AUTO_BASIC_PASSWORD ?? "";
const proEmail = process.env.UAT_AUTO_PRO_EMAIL ?? "";
const proPassword = process.env.UAT_AUTO_PRO_PASSWORD ?? "";

const basicSlug = process.env.UAT_AUTO_BASIC_SLUG?.trim() || "default";
const proSlug = process.env.UAT_AUTO_PRO_SLUG?.trim() || "creativorare";

const HARNESS_FORM_SCHEMA = {
  version: 1,
  fields: [
    {
      id: "full_name",
      type: "text",
      label: "Full name",
      required: true,
    },
    {
      id: "phone",
      type: "phone",
      label: "Phone",
      required: true,
      phoneCountry: "SG",
    },
    {
      id: "email",
      type: "email",
      label: "Email",
      required: true,
    },
    {
      id: "consent",
      type: "consent",
      label: "Consent",
      required: true,
      consentText: "I agree to be contacted about future activities.",
    },
  ],
};

function workspaceOrigin(slug: string): string {
  const base = process.env.UAT_PUBLIC_BASE_URL ?? "";
  if (!base) {
    throw new Error("UAT_PUBLIC_BASE_URL is required");
  }
  const url = new URL(base);
  if (!url.hostname.startsWith(`${slug}.`)) {
    url.hostname = `${slug}.${url.hostname}`;
  }
  return url.origin;
}

function isDesktopProject(testInfoName: string): boolean {
  return testInfoName.includes("desktop");
}

async function loginOnWorkspace(
  page: Page,
  origin: string,
  email: string,
  password: string,
) {
  const response = await page.goto(`${origin}/login`, {
    waitUntil: "domcontentloaded",
  });
  expect(response?.ok()).toBeTruthy();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /sign in to workspace/i }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 20_000 });
  await expect(page.locator("main, [role='main']").first()).toBeVisible();
}

async function apiLogin(
  request: APIRequestContext,
  origin: string,
  email: string,
  password: string,
): Promise<string> {
  const response = await request.post(`${origin}/api/v1/auth/login`, {
    data: { email, password },
  });
  expect(response.ok(), `login ${response.status()}`).toBeTruthy();
  const body = (await response.json()) as {
    accessToken?: string;
    AccessToken?: string;
  };
  const token = body.accessToken ?? body.AccessToken;
  expect(token, "login returned an access token").toBeTruthy();
  return token!;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function readJson(response: { json: () => Promise<unknown> }): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

async function firstNamed(
  request: APIRequestContext,
  origin: string,
  token: string,
  path: string,
): Promise<string | null> {
  const response = await request.get(`${origin}${path}`, { headers: authHeaders(token) });
  if (!response.ok()) {
    return null;
  }
  const body = await readJson(response);
  const items = (body.items ?? body.Items) as Array<{ name?: string; Name?: string }> | undefined;
  const name = items?.[0]?.name ?? items?.[0]?.Name;
  return typeof name === "string" && name.trim() ? name : null;
}

async function ensureCatalog(
  request: APIRequestContext,
  origin: string,
  token: string,
): Promise<{ community: string; category: string }> {
  let community = await firstNamed(request, origin, token, "/api/v1/admin/communities");
  if (!community) {
    const created = await request.post(`${origin}/api/v1/admin/communities`, {
      headers: authHeaders(token),
      data: { name: "19.5 Harness" },
    });
    expect(created.ok(), `create community ${created.status()} ${await created.text()}`).toBeTruthy();
    const body = await readJson(created);
    community = String(body.name ?? body.Name ?? "19.5 Harness");
  }

  let category = await firstNamed(request, origin, token, "/api/v1/admin/categories");
  if (!category) {
    const created = await request.post(`${origin}/api/v1/admin/categories`, {
      headers: authHeaders(token),
      data: { name: "19.5 Category" },
    });
    expect(created.ok(), `create category ${created.status()} ${await created.text()}`).toBeTruthy();
    const body = await readJson(created);
    category = String(body.name ?? body.Name ?? "19.5 Category");
  }

  return { community, category };
}

async function createPublishedActivity(
  request: APIRequestContext,
  origin: string,
  token: string,
  catalog: { community: string; category: string },
  name: string,
): Promise<{ id: string; slug: string }> {
  const created = await request.post(`${origin}/api/v1/admin/activities`, {
    headers: authHeaders(token),
    data: {
      name,
      category: catalog.category,
      schedule: "Sat 10:00",
      location: "UAT harness",
      communityLabel: catalog.community,
      status: "draft",
    },
  });
  expect(created.ok(), `create activity ${created.status()} ${await created.text()}`).toBeTruthy();
  const activity = await readJson(created);
  const id = String(activity.id ?? activity.Id);
  const slug = String(activity.slug ?? activity.Slug);

  const schema = await request.put(`${origin}/api/v1/admin/activities/${id}/form-schema`, {
    headers: authHeaders(token),
    data: { formSchema: HARNESS_FORM_SCHEMA },
  });
  expect(schema.ok(), `form schema ${schema.status()} ${await schema.text()}`).toBeTruthy();

  const published = await request.post(`${origin}/api/v1/admin/activities/${id}/publish`, {
    headers: authHeaders(token),
  });
  expect(published.ok(), `publish ${published.status()} ${await published.text()}`).toBeTruthy();

  return { id, slug };
}

async function unpublishIfPresent(
  request: APIRequestContext,
  origin: string,
  token: string,
  activityId: string | undefined,
) {
  if (!activityId) {
    return;
  }
  const unpublish = await request.post(
    `${origin}/api/v1/admin/activities/${activityId}/unpublish`,
    { headers: authHeaders(token) },
  );
  expect(unpublish.ok(), `unpublish ${unpublish.status()}`).toBeTruthy();
}

test.describe("19.5 operator core flows", () => {
  test("Basic dashboard metrics load", async ({ page }) => {
    test.skip(
      !basicEmail || !basicPassword,
      "UAT_AUTO_BASIC_EMAIL/PASSWORD are not mapped",
    );
    const origin = workspaceOrigin(basicSlug);
    await loginOnWorkspace(page, origin, basicEmail, basicPassword);
    await page.goto(`${origin}/dashboard`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("Basic activities room loads", async ({ page }) => {
    test.skip(
      !basicEmail || !basicPassword,
      "UAT_AUTO_BASIC_EMAIL/PASSWORD are not mapped",
    );
    const origin = workspaceOrigin(basicSlug);
    await loginOnWorkspace(page, origin, basicEmail, basicPassword);
    await page.goto(`${origin}/activities`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { level: 1, name: "Activities" })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("Basic website is Core-locked and public stub home loads", async ({ page }) => {
    test.skip(
      !basicEmail || !basicPassword,
      "UAT_AUTO_BASIC_EMAIL/PASSWORD are not mapped",
    );
    const origin = workspaceOrigin(basicSlug);
    await loginOnWorkspace(page, origin, basicEmail, basicPassword);
    await page.goto(`${origin}/dashboard/website`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { name: /unlock a branded public homepage/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator("#website-builder-toolbar")).toHaveCount(0);

    const home = await page.request.get(`${origin}/`);
    expect(home.ok()).toBeTruthy();
  });

  test("Basic campaigns room is Pro-locked", async ({ page }) => {
    test.skip(
      !basicEmail || !basicPassword,
      "UAT_AUTO_BASIC_EMAIL/PASSWORD are not mapped",
    );
    const origin = workspaceOrigin(basicSlug);
    await loginOnWorkspace(page, origin, basicEmail, basicPassword);
    await page.goto(`${origin}/campaigns`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { name: /email campaigns are a pro craft/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("Pro dashboard metrics load", async ({ page }) => {
    test.skip(
      !proEmail || !proPassword,
      "UAT_AUTO_PRO_EMAIL/PASSWORD are not mapped",
    );
    const origin = workspaceOrigin(proSlug);
    await loginOnWorkspace(page, origin, proEmail, proPassword);
    await page.goto(`${origin}/dashboard`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("Pro analytics room loads", async ({ page }) => {
    test.skip(
      !proEmail || !proPassword,
      "UAT_AUTO_PRO_EMAIL/PASSWORD are not mapped",
    );
    const origin = workspaceOrigin(proSlug);
    await loginOnWorkspace(page, origin, proEmail, proPassword);
    await page.goto(`${origin}/analytics`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { level: 1, name: "Analytics" })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("Pro website studio and public branding load", async ({ page }) => {
    test.skip(
      !proEmail || !proPassword,
      "UAT_AUTO_PRO_EMAIL/PASSWORD are not mapped",
    );
    const origin = workspaceOrigin(proSlug);
    await loginOnWorkspace(page, origin, proEmail, proPassword);
    await page.goto(`${origin}/dashboard/website`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { name: /unlock a branded public homepage/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /website studio/i })).toBeVisible({
      timeout: 20_000,
    });

    const site = await page.request.get(`${origin}/api/v1/public/site`);
    expect(site.ok()).toBeTruthy();
    const body = (await site.json()) as { published?: { siteName?: string } };
    const siteName = body.published?.siteName ?? "";
    expect(siteName.toLowerCase()).toContain("creativorare");
  });

  test("Pro campaigns room loads without sending a blast", async ({ page }) => {
    test.skip(
      !proEmail || !proPassword,
      "UAT_AUTO_PRO_EMAIL/PASSWORD are not mapped",
    );
    const origin = workspaceOrigin(proSlug);
    await loginOnWorkspace(page, origin, proEmail, proPassword);
    await page.goto(`${origin}/campaigns`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { name: /email campaigns are a pro craft/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /upgrade|unlock/i })).toHaveCount(0);
    await expect(page.locator("main, [role='main']").first()).toBeVisible();
  });

  test("Pro create, publish, share, register, dedup, CSV, and campaign test-send", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(
      !proEmail || !proPassword,
      "UAT_AUTO_PRO_EMAIL/PASSWORD are not mapped",
    );
    test.skip(!isDesktopProject(testInfo.project.name), "mutating Pro walk runs once on desktop");
    test.setTimeout(180_000);

    const origin = workspaceOrigin(proSlug);
    const token = await apiLogin(request, origin, proEmail, proPassword);
    const me = await request.get(`${origin}/api/v1/admin/me`, { headers: authHeaders(token) });
    expect(me.ok(), `admin/me ${me.status()}`).toBeTruthy();

    const catalog = await ensureCatalog(request, origin, token);
    const stamp = Date.now().toString(36);
    let firstId: string | undefined;
    let secondId: string | undefined;

    try {
      const first = await createPublishedActivity(
        request,
        origin,
        token,
        catalog,
        `19-5 harness a ${stamp}`,
      );
      firstId = first.id;
      const second = await createPublishedActivity(
        request,
        origin,
        token,
        catalog,
        `19-5 harness b ${stamp}`,
      );
      secondId = second.id;

      await loginOnWorkspace(page, origin, proEmail, proPassword);
      await page.goto(`${origin}/activities/${first.id}`, { waitUntil: "domcontentloaded" });
      const shareTab = page.getByRole("tab", { name: /share kit/i });
      if (await shareTab.isVisible()) {
        await shareTab.click();
      }
      await expect(page.getByText(new RegExp(`/register/${first.slug}`))).toBeVisible({
        timeout: 20_000,
      });

      const registerPage = await request.get(`${origin}/register/${first.slug}`);
      expect(registerPage.ok()).toBeTruthy();

      const phone = `8${String(Date.now()).slice(-7)}`;
      const email = `uat195-${stamp}@example.test`;
      const answers = {
        full_name: "19.5 Harness Registrant",
        phone,
        email,
        consent: true,
      };

      const firstReg = await request.post(`${origin}/api/v1/public/registrations`, {
        data: { activitySlug: first.slug, answers },
      });
      expect(firstReg.status(), await firstReg.text()).toBe(201);
      const firstBody = await readJson(firstReg);
      const firstClientId = String(firstBody.clientId ?? firstBody.ClientId);
      expect(firstClientId).toMatch(/^[0-9a-f-]{36}$/i);

      const secondReg = await request.post(`${origin}/api/v1/public/registrations`, {
        data: {
          activitySlug: second.slug,
          answers: { ...answers, full_name: "19.5 Harness Registrant Two" },
        },
      });
      expect(secondReg.status(), await secondReg.text()).toBe(201);
      const secondBody = await readJson(secondReg);
      expect(String(secondBody.clientId ?? secondBody.ClientId)).toBe(firstClientId);
      expect(String(secondBody.registrationId ?? secondBody.RegistrationId)).not.toBe(
        String(firstBody.registrationId ?? firstBody.RegistrationId),
      );

      const csv = await request.get(`${origin}/api/v1/admin/reports/export?preset=weekly`, {
        headers: authHeaders(token),
      });
      expect(csv.ok(), `csv ${csv.status()}`).toBeTruthy();
      const contentType = csv.headers()["content-type"] ?? "";
      expect(contentType).toMatch(/csv/i);
      const csvText = await csv.text();
      expect(csvText.length).toBeGreaterThan(10);

      const testSend = await request.post(`${origin}/api/v1/admin/campaigns/send-test`, {
        headers: authHeaders(token),
        data: {
          subject: `19.5 harness ${stamp}`,
          body: "<p>Story 19.5 campaign test send. Do not blast the list.</p>",
          bodyFormat: "html",
        },
      });
      expect(testSend.ok(), `campaign test-send ${testSend.status()} ${await testSend.text()}`).toBeTruthy();
      const sendBody = await readJson(testSend);
      expect(sendBody.success ?? sendBody.Success).toBeTruthy();
    } finally {
      await unpublishIfPresent(request, origin, token, firstId);
      await unpublishIfPresent(request, origin, token, secondId);
    }
  });
});
