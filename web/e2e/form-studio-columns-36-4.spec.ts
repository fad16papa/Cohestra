import { expect, test, type Page } from "@playwright/test";

import {
  DEFAULT_PRO_TENANT,
  PX2_BASIC_TENANT,
  loginOwnedTenant,
  openOwnedActivityTab,
  provisionOwnedActivity,
} from "./helpers/e2e-owned-fixtures";
import {
  applyRegistrationTheme,
  EPIC_35_EXPERIENCES,
  EPIC_35_VIEWPORTS,
  fetchActivity,
  loginOperatorSession,
  openActivityTab,
  publishActivity,
  saveActivityFormSchema,
  tenantWebBase,
} from "./helpers/registration-e2e-api";

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

function previewSurface(page: Page) {
  return page.locator(".registration-preview-surface").filter({ visible: true });
}

async function addPaletteField(page: Page, label: RegExp) {
  await page.getByRole("button", { name: label, exact: true }).click();
}

async function renameSelectedField(page: Page, label: string, fieldId: string) {
  await page.getByLabel(/^Label$/i).fill(label);
  await page.getByLabel(/^Field ID$/i).fill(fieldId);
}

async function setPreviewViewport(page: Page, mode: "Desktop" | "Mobile") {
  const toggle = page.getByRole("radiogroup", { name: /Preview viewport/i });
  await toggle.locator("label").filter({ hasText: new RegExp(`^${mode}$`, "i") }).click();
}

test.describe("Story 36.4 — live Form Studio checkpoint", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  let session: Awaited<ReturnType<typeof loginOperatorSession>>;
  let activityId: string;
  let publishSlug: string;
  let publishId: string;

  test.beforeAll(async ({ request }, testInfo) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    session = await loginOperatorSession(request);
    const draft = await provisionOwnedActivity(request, session, {
      ownerKey: "38-3-cols-cp",
      workerIndex: testInfo.workerIndex,
      tenant: DEFAULT_PRO_TENANT,
    });
    activityId = draft.id;
    const published = await provisionOwnedActivity(request, session, {
      ownerKey: "38-3-cols-pub",
      workerIndex: testInfo.workerIndex,
      tenant: DEFAULT_PRO_TENANT,
    });
    publishSlug = published.slug;
    publishId = published.id;
  });

  test("checkpoint: build columns form, preview, save, reload, publish, submit", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

    await saveActivityFormSchema(request, session.accessToken, activityId, {
      version: 1,
      fields: [
        {
          id: "email",
          type: "email",
          label: "Email",
          required: true,
          placeholder: null,
          options: null,
          consentText: null,
        },
      ],
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openActivityTab(page, activityId, "form", session);
    const listbox = page.getByRole("listbox", { name: /Form blocks/i });

    await page.getByRole("button", { name: /^Two-column row$/i }).click();
    await expect(page.getByText(/Left column — drag blocks here/i)).toBeVisible();
    await expect(page.getByText(/Right column — drag blocks here/i)).toBeVisible();

    await listbox.getByRole("option", { name: /Two-column row/i }).click();
    await addPaletteField(page, /^Text$/i);
    await renameSelectedField(page, "First name", "first_name");
    await addPaletteField(page, /^Text$/i);
    await renameSelectedField(page, "Last name", "last_name");
    await listbox.getByRole("option", { name: /Last name/i }).click();
    await page.getByRole("button", { name: /Move Last name to right column/i }).click();
    await listbox.getByRole("option", { name: /Last name/i }).click();
    await page.getByRole("button", { name: /Move Last name to left column/i }).click();
    await listbox.getByRole("option", { name: /Last name/i }).click();
    await page.getByRole("button", { name: /Move Last name to right column/i }).click();

    await page.getByRole("button", { name: /^Heading$/i }).click();
    await page.getByRole("button", { name: /^Paragraph$/i }).click();

    await listbox.getByRole("option", { name: /First name/i }).click();
    const moveFirstUp = page.getByRole("button", { name: /Move First name up/i });
    if (await moveFirstUp.isEnabled()) {
      await moveFirstUp.click();
    }

    await page.locator("#form-studio-tab-preview").click();
    await expect(page.locator("#form-studio-preview-panel")).toBeVisible();
    const preview = previewSurface(page);
    await expect(preview).toBeVisible({ timeout: 30_000 });

    await setPreviewViewport(page, "Desktop");
    await expect(preview.locator(".sm\\:grid-cols-2").first()).toBeVisible();

    await setPreviewViewport(page, "Mobile");
    const mobileLabels = preview.getByText(/First name|Last name/i);
    await expect(mobileLabels.first()).toBeVisible();

    await page.locator("#form-studio-tab-build").click();
    await expect(page.getByText(/Unsaved changes/i)).toBeVisible();

    await page.getByRole("button", { name: /^Save form$/i }).click();
    await expect(page.getByText(/Unsaved changes/i)).toBeHidden({ timeout: 30_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForFormStudio(page);
    await expect(page.getByRole("option", { name: /Two-column row/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /First name/i })).toBeVisible();

    const savedDraft = await fetchActivity(request, session.accessToken, activityId);
    const formSchema = (savedDraft.formSchema ?? savedDraft.FormSchema) as Record<
      string,
      unknown
    >;
    await saveActivityFormSchema(request, session.accessToken, publishId, formSchema);
    await publishActivity(request, session.accessToken, publishId);

    const base = tenantWebBase();
    await page.goto(`${base}/register/${publishSlug}`, { waitUntil: "networkidle" });
    const email = `ada-${Date.now()}@example.com`;
    const firstName = page.getByLabel(/First name/i);
    const lastName = page.getByLabel(/Last name/i);
    const emailField = page.getByLabel(/Email/i);
    await expect(firstName).toBeVisible({ timeout: 30_000 });
    await firstName.fill("Ada");
    await lastName.fill("Lovelace");
    await emailField.fill(email);
    await expect(firstName).toHaveValue("Ada");
    await expect(lastName).toHaveValue("Lovelace");
    await expect(emailField).toHaveValue(email);
    await page.getByRole("button", { name: /join activity/i }).click();
    await expect(page.getByText(/thank|success|registered/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });

});

test.describe("Story 36.4 — Basic plan UI lock", () => {
  test("Two-column row disabled on Basic", async ({ page, request }, testInfo) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

    const session = await loginOwnedTenant(request, PX2_BASIC_TENANT);
    const owned = await provisionOwnedActivity(request, session, {
      ownerKey: "38-3-cols-basic",
      workerIndex: testInfo.workerIndex,
      tenant: PX2_BASIC_TENANT,
    });
    await openOwnedActivityTab(page, owned, "form", session);
    await expect(page.getByRole("button", { name: /^Two-column row$/i })).toBeDisabled();
    await expect(
      page.getByText(/Two-column rows require Core or Pro/i)
    ).toBeVisible();
  });
});

async function waitForFormStudio(page: Page) {
  await expect(page.getByRole("tab", { name: /^Form$/, selected: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { name: /Form builder/i })).toBeVisible();
}

test.describe("Story 36.4 — responsive public matrix (columns form)", () => {
  test.describe.configure({ mode: "serial" });

  let slug: string;

  test.beforeAll(async ({ request }, testInfo) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    const session = await loginOperatorSession(request);
    const owned = await provisionOwnedActivity(request, session, {
      ownerKey: "38-3-cols-mx",
      workerIndex: testInfo.workerIndex,
      formSchema: buildRepresentativeColumnsSchema(),
      publish: true,
    });
    slug = owned.slug;
  });

  for (const viewport of EPIC_35_VIEWPORTS) {
    test(`columns layout @ ${viewport.width}px`, async ({ page }) => {
      test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const base = tenantWebBase();
      const response = await page.goto(`${base}/register/${slug}`, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.ok()).toBeTruthy();
      await assertNoHorizontalOverflow(page);
      await expect(page.getByLabel(/First name/i)).toBeVisible();
      await expect(page.getByLabel(/Last name/i)).toBeVisible();
    });
  }
});

test.describe("Story 36.4 — Epic 35 experiences with columns", () => {
  test.describe.configure({ mode: "serial" });

  let token: string;
  let activityId: string;
  let slug: string;
  let activityRecord: Record<string, unknown>;

  test.beforeAll(async ({ request }, testInfo) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    const session = await loginOperatorSession(request);
    token = session.accessToken;
    const owned = await provisionOwnedActivity(request, session, {
      ownerKey: "38-3-cols-exp",
      workerIndex: testInfo.workerIndex,
      formSchema: buildRepresentativeColumnsSchema(),
      publish: true,
    });
    slug = owned.slug;
    activityId = owned.id;
    activityRecord = owned.record;
  });

  for (const experience of EPIC_35_EXPERIENCES) {
    test(`${experience.label} public smoke with columns`, async ({ page, request }) => {
      test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");

      await applyRegistrationTheme(request, token, activityId, activityRecord, experience.theme);
      await page.setViewportSize({ width: 390, height: 844 });
      const base = tenantWebBase();
      await page.goto(`${base}/register/${slug}`, { waitUntil: "domcontentloaded" });

      if (experience.expect.conversational) {
        await expect(
          page.getByText(/one question at a time|Question \d+ of/i).first()
        ).toBeVisible();
        await expect(page.locator(".sm\\:grid-cols-2")).toHaveCount(0);
      } else {
        await expect(page.getByLabel(/First name/i)).toBeVisible();
        await assertNoHorizontalOverflow(page);
      }
    });
  }
});

function buildRepresentativeColumnsSchema(): Record<string, unknown> {
  return {
    version: 2,
    fields: [
      field("first_name", "text", "First name", true),
      field("last_name", "text", "Last name", true),
      field("email", "email", "Email", true),
      field("experience_level", "select", "Experience level", false, [
        { value: "beginner", label: "Beginner" },
        { value: "advanced", label: "Advanced with a very long option label for overflow testing" },
      ]),
      field("preferred_format", "text", "Preferred format", false),
      field("consent", "consent", "Consent", true),
    ],
    composition: [
      content("h-top", "heading", "About you", 2),
      section("sec1", "Details", [
        columns("cols1", [
          [fieldRef("ref-fn", "first_name")],
          [fieldRef("ref-ln", "last_name")],
        ]),
      ]),
      fieldRef("ref-email", "email"),
      content("p-mid", "paragraph", "Tell us more."),
      columns("cols2", [
        [fieldRef("ref-exp", "experience_level")],
        [fieldRef("ref-fmt", "preferred_format")],
      ]),
      fieldRef("ref-consent", "consent"),
    ],
  };
}

function field(
  id: string,
  type: string,
  label: string,
  required: boolean,
  options?: Array<{ value: string; label: string }>
) {
  return {
    id,
    type,
    label,
    required,
    placeholder: null,
    options: options ?? null,
    consentText: type === "consent" ? "I agree to be contacted." : null,
  };
}

function fieldRef(id: string, fieldId: string) {
  return { id, kind: "fieldRef", fieldId };
}

function content(id: string, contentType: string, text: string, level?: number) {
  return {
    id,
    kind: "content",
    contentType,
    content: { text, level: level ?? null },
  };
}

function section(id: string, title: string, children: unknown[]) {
  return { id, kind: "section", title, description: null, children };
}

function columns(id: string, columnNodes: unknown[][]) {
  return { id, kind: "columns", columns: columnNodes };
}
