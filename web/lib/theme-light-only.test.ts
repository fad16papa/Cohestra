import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import { settingsSections } from "@/components/settings/settings-sections";
import {
  OPERATOR_THEME_STORAGE_KEY,
  PUBLIC_THEME_SESSION_KEY,
  THEME_STORAGE_KEY,
  normalizeThemePreference,
  themeInitScript,
} from "@/components/theme/theme-config";
import { buildBrandAccentStyle } from "@/lib/brand-accent";

const webRoot = resolve(import.meta.dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(webRoot, rel), "utf8");
}

function runInitScript(htmlClass = "dark", colorScheme = "dark"): HTMLElement {
  const dom = new JSDOM(`<!DOCTYPE html><html class="${htmlClass}"></html>`);
  const root = dom.window.document.documentElement;
  root.style.colorScheme = colorScheme;
  const fn = new Function("document", themeInitScript);
  fn(dom.window.document);
  return root;
}

describe("light-only application appearance", () => {
  it("forces light on first paint and never reads storage or prefers-color-scheme", () => {
    expect(themeInitScript).not.toMatch(/localStorage|sessionStorage|matchMedia|prefers-color-scheme/);
    expect(themeInitScript).toContain('classList.remove("dark")');
    expect(themeInitScript).toContain('colorScheme="light"');

    const root = runInitScript("dark", "dark");
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.style.colorScheme).toBe("light");
  });

  it("treats historical preference values as compatibility-only", () => {
    expect(normalizeThemePreference("dark")).toBe("dark");
    expect(normalizeThemePreference("system")).toBe("system");
    expect(normalizeThemePreference("light")).toBe("light");
    expect(normalizeThemePreference("nope")).toBe("light");
    expect(THEME_STORAGE_KEY).toBe("theme");
    expect(OPERATOR_THEME_STORAGE_KEY).toBe("cohestra-theme-operator");
    expect(PUBLIC_THEME_SESSION_KEY).toBe("cohestra-theme-public-session");
  });

  it("computes brand accent against the light surface without a dark branch", () => {
    const source = read("lib/brand-accent.ts");
    expect(source).not.toMatch(/resolvedTheme/);
    expect(source).not.toMatch(/===\s*["']dark["']/);
    const style = buildBrandAccentStyle("#2d6a4f");
    expect(style).toBeDefined();
    expect((style as Record<string, string>)["--primary-foreground"]).toBe("#ffffff");
  });

  it("removes theme-mode runtime and ThemeToggle consumers", () => {
    const gone = [
      "components/theme/theme-toggle.tsx",
      "components/theme/theme-provider.tsx",
      "components/theme/theme-preference-sync.tsx",
      "components/theme/public-theme-context.tsx",
      "components/theme/use-persisted-theme-preference.ts",
      "components/theme/marketing-theme-lock.tsx",
      "components/settings/appearance-section.tsx",
      "lib/public-theme-storage.ts",
    ];
    for (const rel of gone) {
      expect(existsSync(resolve(webRoot, rel)), rel).toBe(false);
    }

    const consumers = [
      "components/layouts/admin-top-bar.tsx",
      "components/auth/auth-flow-shell.tsx",
      "components/layouts/public-form-layout.tsx",
      "components/marketing/site-page-renderer.tsx",
      "app/layout.tsx",
    ];
    for (const rel of consumers) {
      const source = read(rel);
      expect(source, rel).not.toMatch(/ThemeToggle|ThemeProvider|ThemePreferenceSync|next-themes|useTheme/);
    }

    const pkg = read("package.json");
    expect(pkg).not.toMatch(/next-themes/);

    const layout = read("app/layout.tsx");
    expect(layout).toContain('style={{ colorScheme: "light" }}');
    expect(layout).toContain('<meta name="color-scheme" content="light" />');
    expect(layout).toContain("ThemeScript");
    expect(layout).toContain("BrandAccentSync");
  });

  it("removes Settings Appearance and keeps Brand Accent plus Form Studio design", () => {
    expect(settingsSections.some((section) => section.id === "settings-account")).toBe(true);
    expect(settingsSections.some((section) => section.id === "settings-support")).toBe(true);
    expect(settingsSections.some((section) => section.id === "settings-brand")).toBe(true);
    expect(settingsSections.some((section) => /appearance/i.test(section.id + section.label))).toBe(
      false
    );

    const tokens = read("styles/brand-tokens.css");
    expect(tokens).not.toMatch(/^\.dark\s*\{/m);
    expect(tokens).not.toMatch(/invert surface\/text tokens/);

    expect(existsSync(resolve(webRoot, "components/activities/form-composition-builder.tsx"))).toBe(
      true
    );
    expect(existsSync(resolve(webRoot, "components/activities/activity-design-tab.tsx"))).toBe(true);
    expect(existsSync(resolve(webRoot, "lib/registration-experience.ts"))).toBe(true);
  });

  it("aliases Platform semantic tokens to the light global system", () => {
    const source = read("app/(platform)/layout.tsx");
    expect(source).toContain('"--plat-ink": "var(--ink)"');
    expect(source).toContain('"--plat-paper": "var(--paper)"');
    expect(source).toContain('"--plat-paper-warm": "var(--paper-warm)"');
    expect(source).not.toMatch(/#070d12|#141c24/);
  });
});
