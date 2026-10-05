import fs from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  DEFAULT_PRO_TENANT,
  PX2_BASIC_TENANT,
  PX2_CORE_TENANT,
  loginOwnedTenant,
  openOwnedActivityTab,
  provisionOwnedActivity,
} from "./helpers/e2e-owned-fixtures";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-42-3"
);

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844, composition: "stacked" as const },
  { name: "430x932", width: 430, height: 932, composition: "stacked" as const },
  { name: "767x900", width: 767, height: 900, composition: "stacked" as const },
  { name: "768x1024", width: 768, height: 1024, composition: "stacked" as const },
  { name: "1023x768", width: 1023, height: 768, composition: "stacked" as const },
  { name: "1024x768", width: 1024, height: 768, composition: "two-pane" as const },
  { name: "1279x900", width: 1279, height: 900, composition: "two-pane" as const },
  { name: "1280x900", width: 1280, height: 900, composition: "three-pane" as const },
  { name: "1440x900", width: 1440, height: 900, composition: "three-pane" as const },
] as const;

function field(id: string, type: string, label: string) {
  return {
    id,
    type,
    label,
    required: false,
    placeholder: null,
    options: null,
    consentText: null,
  };
}

function nestedFormSchema() {
  return {
    version: 2,
    fields: [
      field("full_name", "text", "Full name"),
      field("nested_note", "text", "Nested note"),
      field("nested_phone", "text", "Nested phone"),
      field("email", "email", "Email"),
    ],
    composition: [
      { id: "block-name", kind: "fieldRef", fieldId: "full_name" },
      {
        id: "block-cols",
        kind: "columns",
        columns: [
          [
            { id: "block-nested", kind: "fieldRef", fieldId: "nested_note" },
            { id: "block-phone", kind: "fieldRef", fieldId: "nested_phone" },
          ],
          [
            {
              id: "block-para",
              kind: "content",
              contentType: "paragraph",
              content: { text: "Right column copy", level: null },
            },
          ],
        ],
      },
      { id: "block-email", kind: "fieldRef", fieldId: "email" },
    ],
  };
}

function basicFormSchema() {
  return {
    version: 2,
    fields: [field("full_name", "text", "Full name"), field("email", "email", "Email")],
    composition: [
      { id: "block-name", kind: "fieldRef", fieldId: "full_name" },
      { id: "block-email", kind: "fieldRef", fieldId: "email" },
    ],
  };
}

async function assertMinTouch(locator: Locator, label: string) {
  await expect(locator, label).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} box`).toBeTruthy();
  expect(box?.height ?? 0, `${label} height`).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0, `${label} width`).toBeGreaterThanOrEqual(44);
}

async function waitStudio(page: Page) {
  await expect(page.getByRole("heading", { name: "Form builder", level: 2 })).toBeVisible({
    timeout: 30_000,
  });
}

async function closeSheet(page: Page) {
  const sheet = page.locator("[data-slot='sheet-content']");
  if (await sheet.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
  }
}

async function openStudio(
  page: Page,
  request: Parameters<typeof loginOwnedTenant>[0],
  ownerKey: string,
  options?: {
    tenant?: typeof DEFAULT_PRO_TENANT;
    schema?: ReturnType<typeof nestedFormSchema>;
    width?: number;
    height?: number;
  }
) {
  const tenant = options?.tenant ?? DEFAULT_PRO_TENANT;
  const session = await loginOwnedTenant(request, tenant);
  const owned = await provisionOwnedActivity(request, session, {
    ownerKey,
    workerIndex: test.info().workerIndex,
    tenant,
    formSchema: options?.schema ?? nestedFormSchema(),
  });
  await page.setViewportSize({
    width: options?.width ?? 1440,
    height: options?.height ?? 900,
  });
  await openOwnedActivityTab(page, owned, "form", session);
  await waitStudio(page);
  return { session, owned };
}

async function optionTitles(page: Page) {
  return page.locator("[data-form-studio-canvas] [role='option']").allTextContents();
}

async function dispatchTouchReorder(page: Page, fromIndex: number, toIndex: number) {
  await page.evaluate(
    ({ fromIndex: from, toIndex: to }) => {
      const handles = [
        ...document.querySelectorAll<HTMLElement>("[data-builder-reorder-handle]"),
      ];
      const source = handles[from];
      const target = handles[to];
      if (!source || !target) {
        throw new Error(`missing handles ${from}->${to} of ${handles.length}`);
      }
      source.scrollIntoView({ block: "center" });
      target.scrollIntoView({ block: "center" });
      const fromBox = source.getBoundingClientRect();
      const toBox = target.getBoundingClientRect();
      const fire = (node: EventTarget, type: string, x: number, y: number) => {
        node.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerType: "touch",
            pointerId: 1,
            isPrimary: true,
            button: 0,
            buttons: type === "pointerup" || type === "pointercancel" ? 0 : 1,
            clientX: x,
            clientY: y,
            view: window,
          })
        );
      };
      const sx = fromBox.left + fromBox.width / 2;
      const sy = fromBox.top + fromBox.height / 2;
      const tx = toBox.left + toBox.width / 2;
      const ty = toBox.top + toBox.height / 2;
      fire(source, "pointerdown", sx, sy);
      fire(document, "pointermove", tx, ty);
      fire(source, "pointermove", tx, ty);
      fire(document, "pointerup", tx, ty);
      fire(source, "pointerup", tx, ty);
    },
    { fromIndex, toIndex }
  );
}

test.describe("Story 42.3 — Form Studio touch and builder controls", () => {
  test("handles measure 44px across D7 compositions", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    await openStudio(page, request, "42-3-measure");
    await assertMinTouch(page.getByRole("button", { name: "Reorder Full name" }), "1440 handle");
    await assertMinTouch(page.getByRole("button", { name: "Move Full name down" }), "1440 move down");
    await assertMinTouch(page.getByRole("button", { name: "Remove Full name" }), "1440 delete");
    await expect(page.getByRole("option", { name: /Full name/i })).toBeVisible();
    expect(await page.locator("[data-builder-reorder-handle]").count()).toBeGreaterThanOrEqual(4);
    await expect(page.locator("#form-studio-preview-panel")).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "three-pane-1440.png"),
    });

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await closeSheet(page);
      await expect(
        page.locator(
          `[data-form-studio-workspace][data-form-studio-composition="${viewport.composition}"]`
        )
      ).toBeVisible();
      await assertMinTouch(
        page.locator("[data-builder-reorder-handle]").first(),
        `${viewport.name} handle`
      );
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      expect(overflow, `${viewport.name} overflow`).toBe(false);
      await expect(page.locator("#form-studio-preview-panel")).toHaveCount(0);
    }

    await page.setViewportSize({ width: 1024, height: 768 });
    await closeSheet(page);
    await page.screenshot({ path: path.join(evidenceDir, "viewports", "two-pane-1024.png") });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: path.join(evidenceDir, "viewports", "three-pane-1280.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await closeSheet(page);
    await page.screenshot({ path: path.join(evidenceDir, "viewports", "handles-390.png") });
    await page.setViewportSize({ width: 430, height: 932 });
    await closeSheet(page);
    await page.screenshot({ path: path.join(evidenceDir, "viewports", "touch-layout-430.png") });
  });

  test("mouse and keyboard reorder keep focus and selection", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "live stack");
    test.setTimeout(120_000);

    await openStudio(page, request, "42-3-mouse-key");
    const nameHandle = page.getByRole("button", { name: "Reorder Full name" });
    const emailHandle = page.getByRole("button", { name: "Reorder Email" });
    await page.getByRole("option", { name: /Full name/i }).click();
    await expect(page.getByRole("option", { name: /Full name/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await nameHandle.dragTo(emailHandle);
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await expect(nameHandle).toBeFocused();
    await expect(page.getByRole("option", { name: /Full name/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "handle-focused.png"),
    });
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "reordered-1440.png"),
    });

    await page.getByRole("button", { name: "Move Email down" }).click();
    await expect(page.getByRole("button", { name: "Reorder Email" })).toBeFocused();
    await expect(page.getByRole("button", { name: "Move Full name up" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Move Email down" })).toBeDisabled();

    await page.getByRole("button", { name: "Move Nested note down" }).click();
    await expect(page.getByRole("button", { name: "Reorder Nested note" })).toBeFocused();
    await expect(page.getByText(/Moved Nested note to position/i)).toBeAttached();
  });

  test("touch pointer reorder starts only from the handle", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "live stack");
    test.setTimeout(120_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    await openStudio(page, request, "42-3-touch", { width: 390, height: 844 });
    await closeSheet(page);
    const before = await optionTitles(page);
    await dispatchTouchReorder(page, 0, 1);
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    const after = await optionTitles(page);
    expect(after[0]).not.toEqual(before[0]);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "touch-390.png"),
    });
  });

  test("tap, cancel, and row scroll do not reorder", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "live stack");
    test.setTimeout(120_000);

    const formSchemaPuts: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "PUT" && req.url().includes("/form-schema")) {
        formSchemaPuts.push(req.url());
      }
    });

    await openStudio(page, request, "42-3-safe");
    const before = await optionTitles(page);

    await page.evaluate(() => {
      const handle = document.querySelector<HTMLElement>("[data-builder-reorder-handle]");
      if (!handle) {
        throw new Error("missing handle");
      }
      const box = handle.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      const fire = (type: string) =>
        handle.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerType: "touch",
            pointerId: 1,
            isPrimary: true,
            button: 0,
            clientX: x,
            clientY: y,
            view: window,
          })
        );
      fire("pointerdown");
      fire("pointerup");
    });
    expect(await optionTitles(page)).toEqual(before);

    await page.evaluate(() => {
      const handles = [
        ...document.querySelectorAll<HTMLElement>("[data-builder-reorder-handle]"),
      ];
      const source = handles[0];
      const target = handles[1];
      if (!source || !target) {
        throw new Error("missing handles");
      }
      const from = source.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      source.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          pointerType: "touch",
          pointerId: 1,
          isPrimary: true,
          button: 0,
          clientX: from.left + 8,
          clientY: from.top + 8,
          view: window,
        })
      );
      document.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          pointerType: "touch",
          pointerId: 1,
          clientX: to.left + 8,
          clientY: to.top + 8,
          view: window,
        })
      );
    });
    await page.keyboard.press("Escape");
    expect(await optionTitles(page)).toEqual(before);

    const optionBox = await page.getByRole("option", { name: /Full name/i }).boundingBox();
    if (optionBox) {
      await page.mouse.move(optionBox.x + optionBox.width / 2, optionBox.y + 8);
      await page.mouse.wheel(0, 200);
    }
    expect(await optionTitles(page)).toEqual(before);
    expect(formSchemaPuts, "scroll/select must not save").toEqual([]);
  });

  test("inspector sheet, resize, then save/reload keep the reorder", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "live stack");
    test.setTimeout(150_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    await openStudio(page, request, "42-3-save", { width: 390, height: 844 });
    await page.getByRole("option", { name: /Full name/i }).click();
    await expect(page.locator("[data-slot='sheet-content']")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-slot='sheet-content']")).toHaveCount(0);
    await expect(page.getByRole("option", { name: /Full name/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await page.getByRole("button", { name: "Move Full name down" }).click();
    await expect(page.getByText("Unsaved changes")).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(
      page.locator('[data-form-studio-workspace][data-form-studio-composition="three-pane"]')
    ).toBeVisible();
    await page.getByRole("button", { name: /Save form/i }).click();
    await expect(page.getByText(/saved/i).first()).toBeVisible({ timeout: 15_000 });
    await page.reload();
    await waitStudio(page);
    const titles = await optionTitles(page);
    expect(titles[0]).toMatch(/Two-column row|Email/i);
    await expect(page.getByRole("button", { name: "Reorder Full name" })).toBeVisible();
  });

  test("dark, forced colors, reduced motion, zoom, and axe", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "live stack");
    test.setTimeout(120_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    await openStudio(page, request, "42-3-a11y");
    const nameHandle = page.getByRole("button", { name: "Reorder Full name" });
    await nameHandle.focus();
    await expect(nameHandle).toBeFocused();

    const axe = await new AxeBuilder({ page })
      .exclude("[disabled]")
      .exclude('[aria-disabled="true"]')
      .analyze();
    const blocking = axe.violations.filter(
      (violation) =>
        (violation.impact === "serious" || violation.impact === "critical") &&
        [
          "color-contrast",
          "landmark-one-main",
          "page-has-heading-one",
          "duplicate-id",
          "button-name",
        ].includes(violation.id)
    );
    expect(blocking).toEqual([]);
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Form builder", level: 2 })).toHaveCount(1);

    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await expect(nameHandle).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "viewports", "dark-1440.png") });
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    await page.emulateMedia({ forcedColors: "active" });
    await expect(nameHandle).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "forced-colors-1440.png"),
    });
    await page.emulateMedia({ forcedColors: "none", reducedMotion: "reduce" });
    await expect(nameHandle).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    await expect(page.getByRole("heading", { name: "Form builder", level: 2 })).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "viewports", "zoom-200-1440.png") });
    await page.evaluate(() => {
      document.documentElement.style.zoom = "";
    });
  });

  test("Basic can reorder basic items; Core columns stay gated; archived cannot", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "live stack");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const basicSession = await loginOwnedTenant(request, PX2_BASIC_TENANT);
    const basicOwned = await provisionOwnedActivity(request, basicSession, {
      ownerKey: "42-3-basic",
      workerIndex: test.info().workerIndex,
      tenant: PX2_BASIC_TENANT,
      formSchema: basicFormSchema(),
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await openOwnedActivityTab(page, basicOwned, "form", basicSession);
    await waitStudio(page);
    await expect(page.getByRole("button", { name: /^Two-column row$/i })).toBeDisabled();
    await page.getByRole("button", { name: "Move Full name down" }).click();
    await expect(page.getByText("Unsaved changes")).toBeVisible();

    const coreSession = await loginOwnedTenant(request, PX2_CORE_TENANT);
    const coreOwned = await provisionOwnedActivity(request, coreSession, {
      ownerKey: "42-3-core",
      workerIndex: test.info().workerIndex,
      tenant: PX2_CORE_TENANT,
      formSchema: nestedFormSchema(),
    });
    await openOwnedActivityTab(page, coreOwned, "form", coreSession);
    await waitStudio(page);
    await assertMinTouch(page.getByRole("button", { name: "Reorder Two-column row" }), "core columns");
    await page.getByRole("button", { name: "Move Nested note down" }).click();
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "core-columns-1280.png"),
    });

    const proSession = await loginOwnedTenant(request, DEFAULT_PRO_TENANT);
    const archived = await provisionOwnedActivity(request, proSession, {
      ownerKey: "42-3-arch",
      workerIndex: test.info().workerIndex,
      tenant: DEFAULT_PRO_TENANT,
      formSchema: nestedFormSchema(),
    });
    await openOwnedActivityTab(page, archived, "overview", proSession);
    await page.getByRole("button", { name: "Archive" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Archive draft" }).click();
    await expect(page.getByText("Archived", { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("tab", { name: /^Form$/ }).click();
    await waitStudio(page);
    await expect(page.getByRole("button", { name: "Reorder Full name" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Move Full name down" })).toBeDisabled();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "archived-1280.png"),
    });
  });
});
