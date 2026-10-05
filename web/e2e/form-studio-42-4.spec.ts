import fs from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  DEFAULT_PRO_TENANT,
  loginOwnedTenant,
  openOwnedActivityTab,
  provisionOwnedActivity,
} from "./helpers/e2e-owned-fixtures";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-42-4"
);

const MARKER = "42.4 unsaved preview marker";

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

function continuitySchema() {
  return {
    version: 2,
    fields: [field("full_name", "text", "Full name"), field("email", "email", "Email")],
    composition: [
      { id: "block-name", kind: "fieldRef", fieldId: "full_name" },
      { id: "block-email", kind: "fieldRef", fieldId: "email" },
    ],
    meta: { introMarkdown: "Saved intro" },
  };
}

async function waitStudio(page: Page) {
  await expect(page.getByRole("heading", { name: "Form builder", level: 2 })).toBeVisible({
    timeout: 30_000,
  });
}

async function assertNoOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  expect(overflow, `${label} overflow`).toBe(false);
}

test.describe("Story 42.4 — Preview and publishing continuity", () => {
  test("Build Preview revert composition and hidden preview", async ({ page, request }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(240_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    const session = await loginOwnedTenant(request, DEFAULT_PRO_TENANT);
    const owned = await provisionOwnedActivity(request, session, {
      ownerKey: "42-4-continuity",
      workerIndex: test.info().workerIndex,
      tenant: DEFAULT_PRO_TENANT,
      formSchema: continuitySchema(),
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openOwnedActivityTab(page, owned, "form", session);
    await waitStudio(page);

    await expect(page.locator("#form-studio-preview-panel")).toHaveCount(0);
    const templates = page.locator("details").filter({
      hasText: "Launch presets and saved recipes",
    });
    await expect(templates).not.toHaveAttribute("open");
    await expect(page.getByText("Templates", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to composition" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Revert unsaved" })).toBeDisabled();

    await page.locator("#form-intro-markdown").fill(MARKER);
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await expect(page.locator("#form-studio-preview-panel")).toHaveCount(0);
    await expect(page.locator('[data-registration-layout-container="preview"]')).toHaveCount(0);

    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "form-build-1440.png"),
      fullPage: true,
    });

    await page.locator("#form-studio-tab-preview").click();
    const preview = page.getByRole("region", { name: "Registration preview" });
    await expect(preview).toBeVisible();
    await expect(preview.getByText(MARKER)).toBeVisible();
    await expect(page.getByText(/Previewing unsaved changes/i)).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "form-preview-1440.png"),
      fullPage: true,
    });

    await page.locator("#form-studio-tab-build").click();
    await waitStudio(page);
    await expect(page.locator("#form-studio-preview-panel")).toHaveCount(0);
    await expect(page.locator("#form-intro-markdown")).toHaveValue(MARKER);

    await page.getByRole("link", { name: "Go to composition" }).click();
    await expect(page.locator("#form-studio-composition")).toBeInViewport();
    await expect(page.getByRole("heading", { name: "Form builder", level: 2 })).toBeVisible();

    await page.getByRole("button", { name: "Revert unsaved" }).click();
    const revert = page.getByRole("alertdialog", { name: "Revert unsaved form changes?" });
    await expect(revert).toBeVisible();
    await revert.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator("#form-intro-markdown")).toHaveValue(MARKER);

    await page.getByRole("button", { name: "Revert unsaved" }).click();
    await page
      .getByRole("alertdialog", { name: "Revert unsaved form changes?" })
      .getByRole("button", { name: "Revert unsaved" })
      .click();
    await expect(page.locator("#form-intro-markdown")).toHaveValue("Saved intro");
    await expect(page.getByText("Reverted to saved form.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Revert unsaved" })).toBeDisabled();

    await page.locator("#form-studio-tab-preview").click();
    await expect(page.getByRole("region", { name: "Registration preview" })).toBeVisible();
    await expect(page.getByText(MARKER)).toHaveCount(0);
    await expect(page.getByText(/Preview matches saved form/i)).toBeVisible();

    await page.getByRole("tab", { name: /^Overview$/i }).click();
    await expect(page.getByRole("heading", { name: "Publishing" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();

    for (const viewport of [
      { name: "1024", width: 1024, height: 768 },
      { name: "390", width: 390, height: 844 },
    ] as const) {
      await page.getByRole("tab", { name: /^Form$/i }).click();
      await page.locator("#form-studio-tab-build").click();
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await waitStudio(page);
      await expect(page.locator("#form-studio-preview-panel")).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Go to composition" })).toBeVisible();
      await assertNoOverflow(page, `build-${viewport.name}`);
      await page.screenshot({
        path: path.join(evidenceDir, "viewports", `form-build-${viewport.name}.png`),
        fullPage: true,
      });

      await page.locator("#form-studio-tab-preview").click();
      await expect(page.getByRole("region", { name: "Registration preview" })).toBeVisible();
      await assertNoOverflow(page, `preview-${viewport.name}`);
      await page.screenshot({
        path: path.join(evidenceDir, "viewports", `form-preview-${viewport.name}.png`),
        fullPage: true,
      });
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator("#form-studio-tab-build").click();
    await waitStudio(page);
    const axe = await new AxeBuilder({ page })
      .include("main#main-content")
      .analyze();
    const blocking = axe.violations.filter(
      (violation) =>
        (violation.impact === "serious" || violation.impact === "critical") &&
        ![
          "color-contrast",
          "color-contrast-enhanced",
          "duplicate-id",
          "duplicate-id-active",
          "duplicate-id-aria",
        ].includes(violation.id)
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
});
