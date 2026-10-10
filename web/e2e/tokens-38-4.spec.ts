import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  loginOperatorSession,
  seedOperatorAuthSession,
  waitForOperatorWorkspace,
  waitForReportsContent,
} from "./helpers/registration-e2e-api";

function luminance(rgb: string): number {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) {
    throw new Error(`Cannot parse color ${rgb}`);
  }
  const channels = match.slice(1, 4).map((value) => {
    const c = Number(value) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "430x932", width: 430, height: 932 },
  { name: "390x844", width: 390, height: 844 },
] as const;

const evidenceDir = path.resolve(
  __dirname,
  "../../_bmad-output/planning-artifacts/evidence/px2-38-4/viewports"
);

const AUTH_ROUTES = [
  { name: "dashboard", path: "/dashboard" },
  { name: "clients", path: "/clients" },
  { name: "activities", path: "/activities" },
  { name: "reports", path: "/reports" },
  { name: "website", path: "/dashboard/website" },
  { name: "settings", path: "/settings" },
  { name: "billing", path: "/settings/billing" },
  { name: "campaigns", path: "/campaigns" },
] as const;

test("semantic muted text is ≥4.5:1 on paper and is not stone", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const measured = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.setAttribute("data-token-probe", "muted");
    probe.style.color = "var(--text-muted)";
    probe.style.backgroundColor = "var(--paper)";
    probe.textContent = "Muted helper";
    document.body.append(probe);
    const styles = getComputedStyle(probe);
    const root = getComputedStyle(document.documentElement);
    const result = {
      color: styles.color,
      background: styles.backgroundColor,
      muted: root.getPropertyValue("--text-muted").trim(),
      stone: root.getPropertyValue("--stone").trim(),
      cinema: root.getPropertyValue("--stone-cinema").trim(),
      mutedForeground: root.getPropertyValue("--muted-foreground").trim(),
    };
    probe.remove();
    return result;
  });

  expect(measured.muted).toBe("#252c33");
  expect(measured.stone).toBe("#8b939c");
  expect(measured.cinema).toBe("#5a636e");
  expect(measured.mutedForeground.length).toBeGreaterThan(0);
  expect(contrast(measured.color, measured.background)).toBeGreaterThanOrEqual(4.5);
});

test("login CTA uses primary fill, not decorative dark lagoon", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const submit = page.getByRole("button", { name: /sign in to workspace/i });
  await expect(submit).toBeVisible();
  const light = await submit.evaluate((el) => {
    const styles = getComputedStyle(el);
    const root = getComputedStyle(document.documentElement);
    return {
      color: styles.color,
      background: styles.backgroundColor,
      primary: root.getPropertyValue("--primary").trim(),
      lagoon: root.getPropertyValue("--lagoon").trim(),
    };
  });
  expect(contrast(light.color, light.background)).toBeGreaterThanOrEqual(4.5);
  expect(light.lagoon).toBe("#0b6b63");
  expect(light.primary).toBe("#043532");

  await page.evaluate(() => {
    window.sessionStorage.setItem("cohestra-theme-public-session", "dark");
    document.documentElement.classList.add("dark");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  const dark = await submit.evaluate((el) => {
    const styles = getComputedStyle(el);
    const root = getComputedStyle(document.documentElement);
    return {
      color: styles.color,
      background: styles.backgroundColor,
      primary: root.getPropertyValue("--primary").trim(),
      lagoon: root.getPropertyValue("--lagoon").trim(),
    };
  });
  expect(dark.primary).toBe("#0f7369");
  expect(dark.lagoon).toBe("#12877d");
  expect(contrast(dark.color, dark.background)).toBeGreaterThanOrEqual(4.5);
});

test("login email field exposes an opaque focus ring", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const email = page.getByLabel(/email/i);
  await email.focus();
  const outline = await email.evaluate((el) => {
    const shell = el.parentElement;
    if (!shell) {
      throw new Error("Login email is missing its field shell");
    }
    const styles = getComputedStyle(shell);
    return {
      boxShadow: styles.boxShadow,
      borderColor: styles.borderColor,
    };
  });
  expect(outline.boxShadow).not.toBe("none");
  expect(outline.boxShadow).not.toMatch(/rgba?\([^)]+,\s*0\.(3|5)/);
});

test("register and forgot-password field shells use an opaque focus ring", async ({ page }) => {
  for (const route of ["/register", "/forgot-password"] as const) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const email = page.getByLabel(/email/i);
    await expect(email).toBeVisible();
    await email.focus();
    const outline = await email.evaluate((el) => {
      const shell = el.closest("div");
      if (!shell) {
        throw new Error("Field shell missing");
      }
      return getComputedStyle(shell).boxShadow;
    });
    expect(outline, route).not.toBe("none");
    expect(outline, route).not.toMatch(/rgba?\([^)]+,\s*0\.(3|5)/);
  }
});

test("login viewports capture required evidence", async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, `login-${viewport.name}.png`),
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    window.sessionStorage.setItem("cohestra-theme-public-session", "dark");
    window.localStorage.setItem("cohestra-theme-operator", "dark");
  });
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: path.join(evidenceDir, "login-1440x900-dark.png"),
    fullPage: true,
  });
});

test("authenticated product viewports when live stack is available", async ({ page, request }) => {
  test.skip(!process.env.E2E_LIVE_STACK, "Set E2E_LIVE_STACK=1 with API+web running.");
  test.setTimeout(120_000);
  fs.mkdirSync(evidenceDir, { recursive: true });

  const session = await loginOperatorSession(request);
  const origin = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
  await seedOperatorAuthSession(page, session);

  const gaps: string[] = [];
  for (const route of AUTH_ROUTES) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${origin}${route.path}`, { waitUntil: "domcontentloaded" });
    if (page.url().includes("/login")) {
      await page.evaluate((stored) => {
        localStorage.setItem("auth_session", JSON.stringify(stored));
      }, session);
      await page.goto(`${origin}${route.path}`, { waitUntil: "domcontentloaded" });
    }

    try {
      await waitForOperatorWorkspace(page);
      if (route.name === "dashboard") {
        await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible({
          timeout: 30_000,
        });
      } else if (route.name === "website") {
        await expect(page.locator("#website-builder-toolbar")).toBeVisible({ timeout: 30_000 });
      } else if (route.name === "clients") {
        await expect(page.getByRole("heading", { name: "Clients", level: 1 })).toBeVisible({
          timeout: 30_000,
        });
      } else if (route.name === "activities") {
        await expect(page.getByRole("heading", { name: "Activities", level: 1 })).toBeVisible({
          timeout: 30_000,
        });
        await expect(page.locator('a[href^="/activities/"][href*="-"]').first()).toBeVisible({
          timeout: 30_000,
        });
      } else if (route.name === "reports") {
        await waitForReportsContent(page);
      } else if (route.name === "campaigns") {
        await expect(page.getByRole("heading", { name: "Campaigns", level: 1 })).toBeVisible({
          timeout: 30_000,
        });
      } else if (route.name === "settings") {
        await expect(page.getByRole("heading", { name: "Plan & limits", level: 1 })).toBeVisible({
          timeout: 30_000,
        });
      }
      await page.screenshot({
        path: path.join(evidenceDir, `${route.name}-1440x900.png`),
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: path.join(evidenceDir, `${route.name}-390x844.png`),
        fullPage: true,
      });
    } catch (error) {
      gaps.push(`${route.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const extraViewports = VIEWPORTS.filter((viewport) => viewport.name !== "1440x900" && viewport.name !== "390x844");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/dashboard`, { waitUntil: "domcontentloaded" });
  await waitForOperatorWorkspace(page);
  await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible({
    timeout: 30_000,
  });
  for (const viewport of extraViewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.screenshot({
      path: path.join(evidenceDir, `dashboard-${viewport.name}.png`),
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/activities`, { waitUntil: "domcontentloaded" });
  await waitForOperatorWorkspace(page);
  await expect(page.locator('a[href^="/activities/"][href*="-"]').first()).toBeVisible({
    timeout: 30_000,
  });
  const activityHref = await page.locator("a[href]").evaluateAll((elements) => {
    const href = elements
      .map((element) => element.getAttribute("href"))
      .find((value) => value && /\/activities\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(value));
    return href ?? null;
  });
  if (activityHref) {
    await page.goto(`${origin}${activityHref}`, { waitUntil: "domcontentloaded" });
    await waitForOperatorWorkspace(page);
    await page.screenshot({
      path: path.join(evidenceDir, "activity-detail-1440x900.png"),
      fullPage: true,
    });
    const formTab = page.getByRole("tab", { name: "Form", exact: true });
    if (await formTab.count()) {
      await formTab.click();
      await expect(formTab).toHaveAttribute("aria-selected", "true");
      await page.screenshot({
        path: path.join(evidenceDir, "form-studio-1440x900.png"),
        fullPage: true,
      });
    } else {
      gaps.push("form-studio: activity detail loaded but no Form tab found");
    }
  } else {
    gaps.push("form-studio: no activity UUID link on /activities");
  }

  fs.writeFileSync(
    path.join(evidenceDir, "..", "visual-gaps.json"),
    JSON.stringify({ generated: new Date().toISOString(), gaps }, null, 2)
  );
  expect(gaps, gaps.join("\n")).toEqual([]);
});
