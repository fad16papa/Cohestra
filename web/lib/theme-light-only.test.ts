import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { settingsSections } from "@/components/settings/settings-sections";
import {
  OPERATOR_THEME_STORAGE_KEY,
  PUBLIC_THEME_SESSION_KEY,
  THEME_STORAGE_KEY,
  isPlatformLightOnlyPath,
  normalizeThemePreference,
  themeInitScript,
} from "@/components/theme/theme-config";
import { buildBrandAccentStyle } from "@/lib/brand-accent";

const webRoot = resolve(import.meta.dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(webRoot, rel), "utf8");
}

const PLATFORM_PATHS = [
  "/platform",
  "/platform/login",
  "/platform/overview",
  "/platform/tenants",
  "/platform/tenants/abc",
  "/platform/ops",
  "/platform/support",
  "/platform/support/1",
  "/platform/audits",
  "/platform/future-surface",
] as const;

const NON_PLATFORM_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/signup",
  "/register",
  "/register/demo-marina-social-meetup",
  "/dashboard",
  "/settings/appearance",
  "/invite/accept",
  "/",
] as const;

type InitOptions = {
  pathname: string;
  htmlClass?: string;
  colorScheme?: string;
  prefersDark?: boolean;
  operatorTheme?: string | null;
  publicTheme?: string | null;
};

function runInitScript(options: InitOptions) {
  const classSet = new Set((options.htmlClass ?? "").split(/\s+/).filter(Boolean));
  const added: string[] = [];
  const removed: string[] = [];
  const root = {
    classList: {
      add(name: string) {
        added.push(name);
        classSet.add(name);
      },
      remove(name: string) {
        removed.push(name);
        classSet.delete(name);
      },
      contains(name: string) {
        return classSet.has(name);
      },
    },
    style: { colorScheme: options.colorScheme ?? "dark" },
  };
  const operator = options.operatorTheme ?? null;
  const publicTheme = options.publicTheme ?? null;
  const fn = new Function(
    "document",
    "location",
    "window",
    "localStorage",
    "sessionStorage",
    themeInitScript
  );
  fn(
    { documentElement: root },
    { pathname: options.pathname },
    { matchMedia: () => ({ matches: Boolean(options.prefersDark) }) },
    {
      getItem(key: string) {
        if (key === OPERATOR_THEME_STORAGE_KEY || key === "theme") {
          return operator;
        }
        return null;
      },
    },
    {
      getItem() {
        return publicTheme;
      },
    }
  );
  return { root, added, removed };
}

describe("PlatformAdmin light-only route helper", () => {
  it("locks /platform and every /platform/** path", () => {
    for (const pathname of PLATFORM_PATHS) {
      expect(isPlatformLightOnlyPath(pathname), pathname).toBe(true);
      expect(themeInitScript).toContain("isPlatformPath");
    }
  });

  it("does not lock tenant, public, or auth paths", () => {
    for (const pathname of NON_PLATFORM_PATHS) {
      expect(isPlatformLightOnlyPath(pathname), pathname).toBe(false);
    }
    expect(isPlatformLightOnlyPath(null)).toBe(false);
    expect(isPlatformLightOnlyPath("")).toBe(false);
    expect(isPlatformLightOnlyPath("/platformlogin")).toBe(false);
  });
});

describe("PlatformAdmin first-paint lock", () => {
  it("forces light on Platform before storage or OS dark can apply", () => {
    for (const pathname of ["/platform/login", "/platform/overview", "/platform"]) {
      const { root, removed, added } = runInitScript({
        pathname,
        htmlClass: "dark",
        colorScheme: "dark",
        prefersDark: true,
        operatorTheme: "dark",
        publicTheme: "dark",
      });
      expect(added, pathname).not.toContain("dark");
      expect(removed, pathname).toContain("dark");
      expect(root.classList.contains("dark"), pathname).toBe(false);
      expect(root.style.colorScheme, pathname).toBe("light");
    }
  });

  it("preserves existing tenant/public resolution off Platform", () => {
    const tenantDark = runInitScript({
      pathname: "/dashboard",
      htmlClass: "",
      colorScheme: "light",
      prefersDark: false,
      operatorTheme: "dark",
    });
    expect(tenantDark.added).toContain("dark");
    expect(tenantDark.root.style.colorScheme).toBe("dark");

    const tenantLight = runInitScript({
      pathname: "/dashboard",
      htmlClass: "dark",
      colorScheme: "dark",
      prefersDark: true,
      operatorTheme: "light",
    });
    expect(tenantLight.removed).toContain("dark");
    expect(tenantLight.root.style.colorScheme).toBe("light");

    const tenantSystemDark = runInitScript({
      pathname: "/dashboard",
      htmlClass: "",
      prefersDark: true,
      operatorTheme: "system",
    });
    expect(tenantSystemDark.added).toContain("dark");
    expect(tenantSystemDark.root.style.colorScheme).toBe("dark");

    const loginPublicDark = runInitScript({
      pathname: "/login",
      htmlClass: "",
      prefersDark: false,
      publicTheme: "dark",
    });
    expect(loginPublicDark.added).toContain("dark");
    expect(loginPublicDark.root.style.colorScheme).toBe("dark");
  });
});

describe("tenant theme architecture remains supported", () => {
  it("keeps Light / Dark / System preference values", () => {
    expect(normalizeThemePreference("dark")).toBe("dark");
    expect(normalizeThemePreference("system")).toBe("system");
    expect(normalizeThemePreference("light")).toBe("light");
    expect(normalizeThemePreference("nope")).toBe("system");
    expect(THEME_STORAGE_KEY).toBe("theme");
    expect(OPERATOR_THEME_STORAGE_KEY).toBe("cohestra-theme-operator");
    expect(PUBLIC_THEME_SESSION_KEY).toBe("cohestra-theme-public-session");
  });

  it("keeps theme runtime, ThemeToggle consumers, and next-themes", () => {
    const required = [
      "components/theme/theme-toggle.tsx",
      "components/theme/theme-provider.tsx",
      "components/theme/theme-preference-sync.tsx",
      "components/theme/public-theme-context.tsx",
      "components/theme/use-persisted-theme-preference.ts",
      "components/theme/marketing-theme-lock.tsx",
      "components/settings/appearance-section.tsx",
      "lib/public-theme-storage.ts",
    ];
    for (const rel of required) {
      expect(existsSync(resolve(webRoot, rel)), rel).toBe(true);
    }

    expect(read("components/layouts/admin-top-bar.tsx")).toMatch(/ThemeToggle/);
    expect(read("components/layouts/public-form-layout.tsx")).toMatch(/ThemeToggle/);
    expect(read("components/marketing/site-page-renderer.tsx")).toMatch(/ThemeToggle/);
    expect(read("components/auth/auth-flow-shell.tsx")).toMatch(/ThemeToggle/);
    expect(read("components/auth/auth-flow-shell.tsx")).toMatch(/showAppearanceToggle = true/);
    expect(read("components/auth/platform-login-page-client.tsx")).toContain(
      "showAppearanceToggle={false}"
    );
    const layout = read("app/layout.tsx");
    expect(layout).toMatch(/ThemeProvider/);
    expect(layout).toMatch(/ThemePreferenceSync/);
    expect(layout.match(/<ThemeScript \/>/g)?.length).toBeGreaterThanOrEqual(2);
    expect(read("package.json")).toMatch(/next-themes/);
    expect(layout).not.toContain('style={{ colorScheme: "light" }}');
    expect(layout).not.toContain('<meta name="color-scheme" content="light" />');
  });

  it("keeps Settings Appearance and theme-aware brand accent", () => {
    expect(settingsSections.some((section) => section.id === "settings-appearance")).toBe(true);
    expect(settingsSections.some((section) => /appearance/i.test(section.id + section.label))).toBe(
      true
    );

    const tokens = read("styles/brand-tokens.css");
    expect(tokens).toMatch(/^\.dark\s*\{/m);

    const source = read("lib/brand-accent.ts");
    expect(source).toMatch(/isDark/);
    const light = buildBrandAccentStyle("#2d6a4f", false);
    const dark = buildBrandAccentStyle("#2d6a4f", true);
    expect(light).toBeDefined();
    expect(dark).toBeDefined();
    expect((light as Record<string, string>)["--primary"]).not.toBe(
      (dark as Record<string, string>)["--primary"]
    );
  });

  it("aliases Platform semantic tokens to the global system and skips preference sync on Platform", () => {
    const source = read("app/(platform)/layout.tsx");
    expect(source).toContain('"--plat-ink": "var(--ink)"');
    expect(source).toContain('"--plat-paper": "var(--paper)"');
    expect(source).toContain('"--plat-paper-warm": "var(--paper-warm)"');
    expect(source).not.toMatch(/#070d12|#141c24/);

    const sync = read("components/theme/theme-preference-sync.tsx");
    expect(sync).toMatch(/isPlatformLightOnlyPath/);
    expect(sync).toMatch(/return;/);

    const provider = read("components/theme/theme-provider.tsx");
    expect(provider).toMatch(/forcedTheme/);
    expect(provider).toMatch(/isPlatformLightOnlyPath/);
    expect(provider).toMatch(/useLayoutEffect/);
  });

  it("keeps Form Studio design modules", () => {
    expect(existsSync(resolve(webRoot, "components/activities/form-composition-builder.tsx"))).toBe(
      true
    );
    expect(existsSync(resolve(webRoot, "components/activities/activity-design-tab.tsx"))).toBe(true);
    expect(existsSync(resolve(webRoot, "lib/registration-experience.ts"))).toBe(true);
  });
});
