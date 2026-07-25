/** Shared theme config — inline script must stay in sync with next-themes storage keys. */
import { parseTenantSlugFromHostname } from "@/lib/tenant-host";

/** @deprecated Legacy single-key storage — migrated to operator key on first load. */
export const LEGACY_THEME_STORAGE_KEY = "theme";

/** Operator dashboard / admin surfaces — synced with profile preference. */
export const OPERATOR_THEME_STORAGE_KEY = "cohestra-theme-operator";

/** Public surfaces (live site, login, registration) — isolated from operator theme. */
export const PUBLIC_THEME_STORAGE_KEY = "cohestra-theme-public";

/** @deprecated Use OPERATOR_THEME_STORAGE_KEY or resolveThemeStorageKey(). */
export const THEME_STORAGE_KEY = LEGACY_THEME_STORAGE_KEY;

export const themePreferences = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof themePreferences)[number];

export function normalizeThemePreference(
  value: string | null | undefined
): ThemePreference {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }

  return "system";
}

/** Marketing apex routes — designed light-only (Midnight Atelier paper tokens). */
export function isMarketingLightOnlyPath(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  return (
    pathname === "/"
    || pathname === "/pricing"
    || pathname === "/terms"
    || pathname === "/privacy"
    || pathname === "/signup"
    || pathname.startsWith("/signup/")
    || pathname === "/invite/accept"
  );
}

export function shouldLockMarketingLightTheme(
  pathname: string | null,
  hostname: string
): boolean {
  if (!isMarketingLightOnlyPath(pathname)) {
    return false;
  }

  return parseTenantSlugFromHostname(hostname) === null;
}

/** Public surfaces use a separate local theme store — not operator profile preference. */
export function isPublicLocalThemePath(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  if (isMarketingLightOnlyPath(pathname)) {
    return true;
  }

  return (
    pathname === "/login"
    || pathname === "/platform/login"
    || pathname.startsWith("/register")
    || pathname === "/forgot-password"
    || pathname === "/reset-password"
  );
}

export function resolveThemeStorageKey(pathname: string | null): string {
  return isPublicLocalThemePath(pathname)
    ? PUBLIC_THEME_STORAGE_KEY
    : OPERATOR_THEME_STORAGE_KEY;
}

export function migrateLegacyThemeStorage(storageKey: string): void {
  if (typeof window === "undefined" || storageKey !== OPERATOR_THEME_STORAGE_KEY) {
    return;
  }

  try {
    const current = localStorage.getItem(OPERATOR_THEME_STORAGE_KEY);
    if (current) {
      return;
    }

    const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (legacy) {
      localStorage.setItem(OPERATOR_THEME_STORAGE_KEY, legacy);
    }
  } catch {
    // ignore quota / privacy mode
  }
}

export const themeOptionLabels: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function getThemeToggleAriaLabel(
  preference: ThemePreference,
  resolved: "light" | "dark"
): string {
  if (preference === "system") {
    return `Appearance: System, currently ${resolved}`;
  }

  return `Appearance: ${themeOptionLabels[preference]}`;
}

export const themeInitScript = `(function(){try{var d=document.documentElement,c="dark",operatorKey="${OPERATOR_THEME_STORAGE_KEY}",publicKey="${PUBLIC_THEME_STORAGE_KEY}",legacyKey="${LEGACY_THEME_STORAGE_KEY}",m=window.matchMedia("(prefers-color-scheme: dark)"),p=location.pathname;function isPublicPath(pathname){if(!pathname)return false;if(pathname==="/"||pathname==="/pricing"||pathname==="/terms"||pathname==="/privacy"||pathname==="/signup"||pathname.indexOf("/signup/")===0||pathname==="/invite/accept")return true;return pathname==="/login"||pathname==="/platform/login"||pathname.indexOf("/register")===0||pathname==="/forgot-password"||pathname==="/reset-password"}function norm(v){return v==="light"||v==="dark"||v==="system"?v:"system"}function apply(t){var theme=norm(t);var isDark=theme==="dark"||(theme==="system"&&m.matches);if(isDark){d.classList.add(c)}else{d.classList.remove(c)}}var key=isPublicPath(p)?publicKey:operatorKey;var s=localStorage.getItem(key);if(!s&&key===operatorKey){s=localStorage.getItem(legacyKey)}apply(s||"system")}catch(e){}})();`;
