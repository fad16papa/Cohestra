import { expect, test, type Page } from "@playwright/test";

import {
  applyRegistrationTheme,
  createDraftActivity,
  EPIC_35_EXPERIENCES,
  EPIC_35_VIEWPORTS,
  fetchActivity,
  findActivityIdBySlug,
  loginOperator,
  loginOperatorSession,
  openActivityTab,
  publishActivity,
  saveActivityFormSchema,
  tenantWebBase,
} from "./helpers/registration-e2e-api";

const DRAFT_SLUG = "demo-runners-draft-clinic";

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

async function selectStructureBlock(page: Page, title: RegExp) {
  await page.getByRole("option", { name: title }).click();
}

async function renameSelectedField(page: Page, label: string, fieldId: string) {
  await page.getByLabel(/^Label$/i).fill(label);
  await page.getByLabel(/^Field ID$/i).fill(fieldId);
}

async function dragBlockToDropZone(page: Page, blockTitle: RegExp, dropText: RegExp) {
  const handle = page.getByRole("button", {
    name: new RegExp(`Drag to reorder .*${blockTitle.source}`, "i"),
  });
  const target = page.getByText(dropText).first();
  await handle.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  const handleBox = await handle.boundingBox();
  const targetBox = await target.boundingBox();
  if (!handleBox || !targetBox) {
    throw new Error("Drag handle or drop target not visible");
  }
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
}

async function setPreviewViewport(page: Page, mode: "Desktop" | "Mobile") {
  const toggle = page.getByRole("group", { name: /Preview viewport/i });
  await toggle.getByRole("button", { name: new RegExp(`^${mode}$`, "i") }).click();
}

test.describe("Story 36.4 — live Form Studio checkpoint", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  let session: Awaited<ReturnType<typeof loginOperatorSession>>;
  let activityId: string;
  let publishSlug: string;

  test.beforeAll(async ({ request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    session = await loginOperatorSession(request);
    activityId = await findActivityIdBySlug(request, session.accessToken, DRAFT_SLUG);
    const created = await createDraftActivity(request, session.accessToken, "e2e-cols-pub");
    publishSlug = created.slug;
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
    const pubId = await findActivityIdBySlug(request, session.accessToken, publishSlug);
    await saveActivityFormSchema(request, session.accessToken, pubId, formSchema);
    await publishActivity(request, session.accessToken, pubId);

    const base = tenantWebBase();
    await page.goto(`${base}/register/${publishSlug}`, { waitUntil: "domcontentloaded" });
    await page.getByLabel(/First name/i).fill("Ada");
    await page.getByLabel(/Last name/i).fill("Lovelace");
    await page.getByLabel(/Email/i).fill(`ada-${Date.now()}@example.com`);
    await page.getByRole("button", { name: /join activity/i }).click();
    await expect(page.getByText(/thank|success|registered/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });

});

test.describe("Story 36.4 — Basic plan UI lock", () => {
  test("Two-column row disabled on Basic", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.skip(
      (process.env.PUBLIC_BASE_URL ?? "").includes(":8088") || process.env.CI === "true",
      "Basic UI plan flip uses host Postgres; server gate covered by dotnet integration tests in CI."
    );

    const { execSync } = await import("node:child_process");
    execSync(
      `sudo -u postgres psql -d cohestra -c "UPDATE tenants SET \\"Plan\\" = 0 WHERE \\"Slug\\" = 'default';"`
    );

    try {
      const session = await loginOperatorSession(request);
      const activityId = await findActivityIdBySlug(request, session.accessToken, DRAFT_SLUG);
      await openActivityTab(page, activityId, "form", session);
      await expect(page.getByRole("button", { name: /^Two-column row$/i })).toBeDisabled();
      await expect(
        page.getByText(/Two-column rows require Core or Pro/i)
      ).toBeVisible();
    } finally {
      execSync(
        `sudo -u postgres psql -d cohestra -c "UPDATE tenants SET \\"Plan\\" = 2 WHERE \\"Slug\\" = 'default';"`
      );
    }
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

  let token: string;
  let slug: string;

  test.beforeAll(async ({ request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    token = await loginOperator(request);
    const created = await createDraftActivity(request, token, "e2e-cols-matrix");
    slug = created.slug;
    await saveActivityFormSchema(request, token, created.id, buildRepresentativeColumnsSchema());
    await publishActivity(request, token, created.id);
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

  test.beforeAll(async ({ request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    token = await loginOperator(request);
    const created = await createDraftActivity(request, token, "e2e-cols-exp");
    slug = created.slug;
    activityId = created.id;
    await saveActivityFormSchema(request, token, activityId, buildRepresentativeColumnsSchema());
    await publishActivity(request, token, activityId);
    activityRecord = await fetchActivity(request, token, activityId);
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
