import fs from "node:fs";
import path from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { analyzeAxe } from "./helpers/analyze-axe";

import {
  DEFAULT_PRO_TENANT,
  loginOwnedTenant,
  openOwnedActivityTab,
  provisionOwnedActivity,
} from "./helpers/e2e-owned-fixtures";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-42-2"
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

type AxeViolation = {
  id: string;
  impact: string | null;
  description: string;
};

function nestedFormSchema() {
  return {
    version: 2,
    fields: [
      field("full_name", "text", "Full name", true),
      field("nested_note", "text", "Nested note", false),
      field("email", "email", "Email", false),
    ],
    composition: [
      fieldRef("block-name", "full_name"),
      columns("block-cols", [
        [fieldRef("block-nested", "nested_note")],
        [content("block-para", "paragraph", "Right column copy")],
      ]),
      fieldRef("block-email", "email"),
    ],
  };
}

function field(id: string, type: string, label: string, required: boolean) {
  return {
    id,
    type,
    label,
    required,
    placeholder: null,
    options: null,
    consentText: null,
  };
}

function fieldRef(id: string, fieldId: string) {
  return { id, kind: "fieldRef", fieldId };
}

function content(id: string, contentType: string, text: string) {
  return { id, kind: "content", contentType, content: { text, level: null } };
}

function columns(id: string, columnNodes: unknown[][]) {
  return { id, kind: "columns", columns: columnNodes };
}

async function assertNoOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  expect(overflow, label).toBe(false);
}

async function assertMinTouch(locator: Locator, label: string): Promise<void> {
  await expect(locator, label).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} bounding box`).toBeTruthy();
  expect(box?.height ?? 0, `${label} height`).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0, `${label} width`).toBeGreaterThanOrEqual(44);
}

async function assertAxe(page: Page, label: string): Promise<void> {
  const results = await analyzeAxe(page);
  const blocking = (results.violations as AxeViolation[]).filter(
    (violation) =>
      (violation.impact === "serious" || violation.impact === "critical") &&
      [
        "color-contrast",
        "landmark-one-main",
        "page-has-heading-one",
        "bypass",
        "region",
        "duplicate-id",
        "duplicate-id-active",
        "duplicate-id-aria",
      ].includes(violation.id)
  );
  expect(blocking, `${label}: ${JSON.stringify(blocking, null, 2)}`).toEqual([]);
}

async function assertUniqueIds(page: Page): Promise<void> {
  const duplicates = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")]
      .map((node) => node.id)
      .filter(Boolean);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  });
  expect(duplicates).toEqual([]);
}

async function waitForFormStudio(page: Page): Promise<void> {
  await expect(page.getByRole("tab", { name: /^Form$/, selected: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { name: "Form builder", level: 2 })).toBeVisible();
}

async function waitForComposition(
  page: Page,
  composition: "stacked" | "two-pane" | "three-pane"
): Promise<void> {
  await expect(
    page.locator(`[data-form-studio-workspace][data-form-studio-composition="${composition}"]`)
  ).toBeVisible();
}

async function openInspector(page: Page, composition: "stacked" | "two-pane" | "three-pane") {
  if (composition === "three-pane") {
    return;
  }

  const toggle = page.locator("#form-studio-inspector-toggle");
  if ((await toggle.getAttribute("aria-expanded")) === "true") {
    return;
  }

  await toggle.click();
  if (composition === "stacked") {
    await expect(page.locator("[data-slot='sheet-content']")).toBeVisible();
  } else {
    await expect(page.locator("[data-form-studio-inspector='docked']")).toBeVisible();
  }
}

test.describe("Story 42.2 — Form Studio responsive composition", () => {
  test("D7 compositions, resize continuity, sheet, and a11y", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(240_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const session = await loginOwnedTenant(request, DEFAULT_PRO_TENANT);
    const owned = await provisionOwnedActivity(request, session, {
      ownerKey: "42-2-d7",
      workerIndex: test.info().workerIndex,
      tenant: DEFAULT_PRO_TENANT,
      formSchema: nestedFormSchema(),
    });

    const formSchemaPuts: string[] = [];
    const activityGets: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (req.method() === "PUT" && url.includes("/form-schema")) {
        formSchemaPuts.push(url);
      }
      if (
        req.method() === "GET" &&
        /\/api\/v1\/admin\/activities\/[0-9a-fA-F-]+(?:\?|$)/.test(url)
      ) {
        activityGets.push(url);
      }
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openOwnedActivityTab(page, owned, "form", session);
    await waitForFormStudio(page);
    await waitForComposition(page, "three-pane");

    const activityGetsAfterLoad = activityGets.length;

    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Form builder", level: 2 })).toHaveCount(1);
    await expect(page.locator("#form-studio-preview-panel")).toHaveCount(0);
    await expect(page.locator("[data-form-studio-palette]")).toBeVisible();
    await expect(page.locator("[data-form-studio-canvas]")).toBeVisible();
    await expect(page.locator("[data-form-studio-inspector='docked']")).toBeVisible();
    await expect(page.locator("#form-studio-inspector-toggle")).toBeHidden();

    const desktopPalette = await page.locator("[data-form-studio-palette]").boundingBox();
    const desktopCanvas = await page.locator("[data-form-studio-canvas]").boundingBox();
    const desktopInspector = await page.locator("[data-form-studio-inspector]").boundingBox();
    expect(desktopPalette && desktopCanvas && desktopInspector).toBeTruthy();
    expect((desktopCanvas?.x ?? 0) + (desktopCanvas?.width ?? 0)).toBeLessThanOrEqual(
      (desktopInspector?.x ?? 0) + 1
    );

    await page.getByRole("option", { name: /Nested note/i }).click();
    await expect(page.getByRole("option", { name: /Nested note/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await page.getByLabel(/^Label$/i).fill("Nested note kept");
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "selected-nested-1440.png"),
      fullPage: true,
    });

    await page.getByLabel(/^Label$/i).focus();
    await page.setViewportSize({ width: 1279, height: 900 });
    await waitForComposition(page, "two-pane");
    await expect(page.locator("[data-form-studio-inspector='docked']")).toBeVisible();
    await expect(page.locator("#form-studio-inspector-toggle")).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    await expect(page.getByLabel(/^Label$/i)).toHaveValue("Nested note kept");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "resize-1440-to-1279.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForComposition(page, "three-pane");

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const openSheet = page.locator("[data-slot='sheet-content']");
      if (await openSheet.isVisible().catch(() => false)) {
        await page.keyboard.press("Escape");
        await expect(openSheet).toHaveCount(0);
      }
      await waitForFormStudio(page);
      await waitForComposition(page, viewport.composition);
      await assertNoOverflow(page, `${viewport.name} overflow`);
      await expect(page.locator("[data-form-studio-palette]")).toBeVisible();
      await expect(page.locator("[data-form-studio-canvas]")).toBeVisible();
      await expect(page.getByRole("option", { name: /Nested note kept/i })).toHaveAttribute(
        "aria-selected",
        "true"
      );
      await expect(page.getByText("Unsaved changes")).toBeVisible();
      await expect(page.locator("#form-studio-preview-panel")).toHaveCount(0);
      await expect(page.locator("main#main-content")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.getByRole("heading", { name: "Form builder", level: 2 })).toHaveCount(1);
      await assertUniqueIds(page);

      const toggle = page.locator("#form-studio-inspector-toggle");
      if (viewport.composition === "three-pane") {
        await expect(page.locator("[data-form-studio-inspector='docked']")).toBeVisible();
        await expect(toggle).toBeHidden();
        await expect(page.locator("[data-slot='sheet-content']")).toHaveCount(0);
        const inspectorCount = await page.locator("[data-form-studio-inspector]").count();
        expect(inspectorCount).toBe(1);
      } else {
        await expect(toggle).toBeVisible();
        await assertMinTouch(toggle, `${viewport.name} inspector toggle`);
        if (viewport.composition === "two-pane") {
          await expect(toggle).toHaveAttribute("aria-controls", "form-studio-inspector");
        } else if ((await toggle.getAttribute("aria-expanded")) !== "true") {
          await expect(toggle).not.toHaveAttribute("aria-controls", "form-studio-inspector");
        }
        if ((await toggle.getAttribute("aria-expanded")) === "true") {
          await toggle.click();
        }
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        await expect(page.locator("[data-form-studio-inspector]:visible")).toHaveCount(0);
        const hiddenInspectorTabbable = await page.evaluate(() => {
          const hidden = document.querySelector<HTMLElement>(
            "[data-form-studio-inspector][hidden]"
          );
          if (!hidden) {
            return [];
          }
          return [...hidden.querySelectorAll<HTMLElement>("button, input, select, textarea, a")]
            .filter((element) => element.tabIndex >= 0 && !hidden.inert)
            .map((element) => element.id || element.getAttribute("aria-label") || element.tagName);
        });
        expect(hiddenInspectorTabbable).toEqual([]);
      }

      await page.screenshot({
        path: path.join(evidenceDir, "viewports", `build-${viewport.name}.png`),
        fullPage: true,
      });
    }

    await page.setViewportSize({ width: 1279, height: 900 });
    await waitForComposition(page, "two-pane");
    await expect(page.locator("[data-form-studio-inspector='docked']")).toBeVisible();
    await expect(page.locator("#form-studio-inspector-toggle")).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    const twoPaneCanvas = await page.locator("[data-form-studio-canvas]").boundingBox();
    const twoPaneInspector = await page.locator("[data-form-studio-inspector]").boundingBox();
    expect(twoPaneCanvas && twoPaneInspector).toBeTruthy();
    expect(twoPaneCanvas?.x ?? 0).toBeLessThan(twoPaneInspector?.x ?? 0);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "inspector-open-1279.png"),
      fullPage: true,
    });

    await page.getByLabel(/^Label$/i).focus();
    await page.locator("#form-studio-inspector-toggle").click();
    await expect(page.locator("#form-studio-inspector-toggle")).toBeFocused();
    await expect(page.locator("[data-form-studio-inspector]:visible")).toHaveCount(0);
    await expect(page.getByRole("option", { name: /Nested note kept/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await page.setViewportSize({ width: 1280, height: 900 });
    await waitForComposition(page, "three-pane");
    await expect(page.locator("[data-form-studio-inspector='docked']")).toBeVisible();
    await expect(page.getByLabel(/^Label$/i)).toHaveValue("Nested note kept");

    await page.setViewportSize({ width: 390, height: 844 });
    await waitForComposition(page, "stacked");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "stacked-390.png"),
      fullPage: true,
    });
    await openInspector(page, "stacked");
    await expect(page.locator("[data-slot='sheet-content']")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Block properties" })).toBeVisible();
    await assertMinTouch(
      page.locator("[data-slot='sheet-content'] [data-slot='sheet-close']"),
      "sheet close"
    );
    await expect(page.locator("[data-form-studio-inspector='sheet']")).toBeVisible();
    await expect(page.locator("[data-form-studio-inspector='docked']")).toHaveCount(0);
    const inertWhileOpen = await page.evaluate(() =>
      [...document.body.children].some(
        (child) =>
          child.hasAttribute("inert") && !child.querySelector("[data-slot='sheet-content']")
      )
    );
    expect(inertWhileOpen).toBe(true);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "inspector-sheet-390.png"),
      fullPage: true,
    });

    await page.keyboard.press("Escape");
    await expect(page.locator("[data-slot='sheet-content']")).toHaveCount(0);
    await expect(page.locator("#form-studio-inspector-toggle")).toBeFocused();
    await expect(page.getByRole("option", { name: /Nested note kept/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await openInspector(page, "stacked");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "sheet-open-before-resize.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1024, height: 768 });
    await waitForComposition(page, "two-pane");
    await expect(page.locator("[data-slot='sheet-content']")).toHaveCount(0);
    await expect(page.locator("[data-form-studio-inspector='docked']")).toBeVisible();
    await expect(page.locator("#form-studio-inspector-toggle")).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(
      await page.evaluate(() =>
        [...document.body.children].some((child) => child.hasAttribute("inert"))
      )
    ).toBe(false);
    await page.setViewportSize({ width: 1023, height: 768 });
    await waitForComposition(page, "stacked");
    await expect(page.locator("[data-slot='sheet-content']")).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForComposition(page, "three-pane");
    await expect(page.locator("[data-slot='sheet-content']")).toHaveCount(0);
    const leftoverInert = await page.evaluate(() =>
      [...document.body.children].some((child) => child.hasAttribute("inert"))
    );
    expect(leftoverInert).toBe(false);
    const overflowLocked = await page.evaluate(() => document.body.style.overflow === "hidden");
    expect(overflowLocked).toBe(false);
    await expect(page.locator("[data-form-studio-inspector='docked']")).toBeVisible();
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "after-sheet-resize-1440.png"),
      fullPage: true,
    });

    expect(formSchemaPuts, "resize must not save").toEqual([]);
    expect(activityGets.length, "resize must not refetch activity").toBe(activityGetsAfterLoad);

    await assertAxe(page, "form studio 1440");

    await page.evaluate(() => {
      window.localStorage.setItem("cohestra-theme-operator", "dark");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "dark-storage-ignored-1440.png"),
      fullPage: true,
    });

    await page.emulateMedia({ forcedColors: "active" });
    await expect(page.getByRole("heading", { name: "Form builder", level: 2 })).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "forced-colors-1440.png"),
      fullPage: true,
    });
    await page.emulateMedia({ forcedColors: "none" });

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("[data-form-studio-workspace]")).toBeVisible();
    await page.emulateMedia({ reducedMotion: "no-preference" });

    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    await expect(page.getByRole("heading", { name: "Form builder", level: 2 })).toBeVisible();
    await assertNoOverflow(page, "200% zoom overflow");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "zoom-200-1440.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForComposition(page, "stacked");
    await assertNoOverflow(page, "200% zoom mobile overflow");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "zoom-200-390.png"),
      fullPage: true,
    });
    await page.evaluate(() => {
      document.documentElement.style.zoom = "";
    });
  });
});
