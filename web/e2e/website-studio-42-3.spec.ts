import fs from "node:fs";
import path from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  loginOperatorSession,
  seedOperatorAuthSession,
  tenantWebBase,
  waitForOperatorWorkspace,
} from "./helpers/registration-e2e-api";

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-42-3"
);

async function openWebsiteStudio(page: Page, request: Parameters<typeof loginOperatorSession>[0]) {
  const session = await loginOperatorSession(request);
  await seedOperatorAuthSession(page, session);
  const origin = tenantWebBase();
  await page.goto(`${origin}/dashboard/website`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.evaluate((stored) => {
      localStorage.setItem("auth_session", JSON.stringify(stored));
    }, session);
    await page.goto(`${origin}/dashboard/website`, { waitUntil: "domcontentloaded" });
  }
  await waitForOperatorWorkspace(page);
  await page.evaluate(() => {
    const slug = window.location.hostname.split(".")[0] || "default";
    const completed = `activity-lead:website-builder-tour-completed:${encodeURIComponent(slug.toLowerCase())}`;
    const visited = `activity-lead:website-builder-visited:${encodeURIComponent(slug.toLowerCase())}`;
    window.localStorage.setItem(completed, "1");
    window.localStorage.setItem(visited, "1");
  });
  const skipTour = page.getByRole("button", { name: "Skip tour" });
  if (await skipTour.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await skipTour.click();
  }
  await expect(page.getByRole("heading", { name: "Website Studio", level: 1 })).toBeVisible();
}

async function assertMinTouch(locator: Locator, label: string) {
  await expect(locator, label).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} box`).toBeTruthy();
  expect(box?.height ?? 0, `${label} height`).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0, `${label} width`).toBeGreaterThanOrEqual(44);
}

async function sectionHandleNames(page: Page) {
  return page.locator("[data-builder-reorder-handle]").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("aria-label") ?? "")
  );
}

test.describe("Story 42.3 — Website section handles", () => {
  test("section handles are 44px and reorder by keyboard, touch, and save/reload", async ({
    page,
    request,
  }) => {
    test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
    test.setTimeout(180_000);
    fs.mkdirSync(path.join(evidenceDir, "viewports"), { recursive: true });

    await page.setViewportSize({ width: 1280, height: 900 });
    await openWebsiteStudio(page, request);
    await expect(page.locator("#website-builder-live-preview")).toHaveCount(0);
    await page.getByRole("tab", { name: "Sections" }).click();

    const handle = page.locator("[data-builder-reorder-handle]").first();
    await expect(handle).toBeVisible();
    await assertMinTouch(handle, "website handle 1280");
    await expect(handle).toHaveAttribute("aria-label", /Reorder /);

    const original = await sectionHandleNames(page);
    expect(original.length).toBeGreaterThan(1);

    await handle.focus();
    await page.keyboard.press("ArrowDown");
    const afterKeyboard = await sectionHandleNames(page);
    expect(afterKeyboard[0]).not.toEqual(original[0]);

    await page.getByRole("button", { name: original[0] }).focus();
    await page.keyboard.press("ArrowUp");
    expect(await sectionHandleNames(page)).toEqual(original);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("tab", { name: "Edit" })).toBeVisible();
    await page.getByRole("tab", { name: "Edit" }).click();
    await page.getByRole("tab", { name: "Sections" }).click();
    await expect(page.locator("#website-builder-live-preview")).toHaveCount(0);
    await assertMinTouch(
      page.locator("[data-builder-reorder-handle]").first(),
      "website handle 390"
    );
    const moveDown = page.getByRole("button", { name: /Move .+ down/ }).first();
    await assertMinTouch(moveDown, "website move down 390");
    await page.screenshot({
      path: path.join(evidenceDir, "viewports", "website-handles-390.png"),
    });

    await page.evaluate(() => {
      const handles = [
        ...document.querySelectorAll<HTMLElement>("[data-builder-reorder-handle]"),
      ];
      const source = handles[0];
      const target = handles[1];
      if (!source || !target) {
        throw new Error("missing website handles");
      }
      const targetRow = target.closest("[data-website-section-id]");
      if (!targetRow) {
        throw new Error("missing website section row");
      }
      source.scrollIntoView({ block: "center" });
      targetRow.scrollIntoView({ block: "center" });
      const from = source.getBoundingClientRect();
      const to = targetRow.getBoundingClientRect();
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
            buttons: type === "pointerup" ? 0 : 1,
            clientX: x,
            clientY: y,
            view: window,
          })
        );
      };
      fire(source, "pointerdown", from.left + 8, from.top + 8);
      fire(document, "pointermove", to.left + 8, to.top + to.height * 0.8);
      fire(document, "pointerup", to.left + 8, to.top + to.height * 0.8);
    });
    const afterTouch = await sectionHandleNames(page);
    expect(afterTouch[0]).not.toEqual(original[0]);

    const saveDraft = page.getByRole("button", { name: /^Save draft$/i });
    try {
      if (await saveDraft.isEnabled()) {
        await saveDraft.click();
        await expect(saveDraft).toBeDisabled({ timeout: 15_000 });
      }
      await page.reload();
      await expect(page.getByRole("heading", { name: "Website Studio", level: 1 })).toBeVisible();
      const skipTour = page.getByRole("button", { name: "Skip tour" });
      if (await skipTour.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await skipTour.click();
      }
      if (await page.getByRole("tab", { name: "Edit" }).isVisible().catch(() => false)) {
        await page.getByRole("tab", { name: "Edit" }).click();
      }
      await page.getByRole("tab", { name: "Sections" }).click();
      expect(await sectionHandleNames(page)).toEqual(afterTouch);
    } finally {
      const current = await sectionHandleNames(page);
      if (current[0] !== original[0]) {
        await page.getByRole("button", { name: original[0] }).focus();
        await page.keyboard.press("ArrowUp");
        if (await saveDraft.isEnabled()) {
          await saveDraft.click();
          await expect(saveDraft).toBeDisabled({ timeout: 15_000 });
        }
      }
    }
  });
});
