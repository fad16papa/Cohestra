/** Shared theme config — inline script must stay in sync with next-themes storage keys. */
import { parseTenantSlugFromHostname } from "@/lib/tenant-host";

/** @deprecated Legacy single-key storage — migrated to operator key on first load. */
export const LEGACY_THEME_STORAGE_KEY = "theme";

/** Operator dashboard / admin surfaces — synced with profile preference. */
export const OPERATOR_THEME_STORAGE_KEY = "cohestra-theme-operator";

/** Public surfaces (live site, login, registration) — sessionStorage per tab. */
export const PUBLIC_THEME_SESSION_KEY = "cohestra-theme-public-session";

/** @deprecated Public localStorage key — replaced by sessionStorage per tab. */
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
    || pathname === "/docs"
    || pathname === "/terms"
    || pathname === "/privacy"
    || pathname === "/signup"
    || pathname.startsWith("/signup/")
    || pathname === "/invite/accept"
    || pathname === "/billing/paddle-return"
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

/** Public surfaces use sessionStorage per tab — not operator profile preference. */
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

/** usePathname() can be empty during hydration — fall back to the browser URL. */
export function effectivePathname(pathname: string | null | undefined): string | null {
  if (pathname && pathname.length > 0) {
    return pathname;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.location.pathname || null;
}

export function migrateLegacyThemeStorage(): void {
  if (typeof window === "undefined") {
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

export const themeInitScript = `(function(){try{var d=document.documentElement,c="dark",operatorKey="${OPERATOR_THEME_STORAGE_KEY}",legacyKey="${LEGACY_THEME_STORAGE_KEY}",sessionKey="${PUBLIC_THEME_SESSION_KEY}",m=window.matchMedia("(prefers-color-scheme: dark)"),p=location.pathname;function isPublicPath(pathname){if(!pathname)return false;if(pathname==="/"||pathname==="/pricing"||pathname==="/docs"||pathname==="/terms"||pathname==="/privacy"||pathname==="/signup"||pathname.indexOf("/signup/")===0||pathname==="/invite/accept"||pathname==="/billing/paddle-return")return true;return pathname==="/login"||pathname==="/platform/login"||pathname.indexOf("/register")===0||pathname==="/forgot-password"||pathname==="/reset-password"}function norm(v){return v==="light"||v==="dark"||v==="system"?v:"system"}function resolve(theme){var t=norm(theme);if(t==="dark")return"dark";if(t==="light")return"light";return m.matches?"dark":"light"}function applyResolved(r){if(r==="dark"){d.classList.add(c)}else{d.classList.remove(c)}d.style.colorScheme=r}var isPublic=isPublicPath(p);var s=null;if(isPublic){try{s=sessionStorage.getItem(sessionKey)}catch(e){}}else{try{s=localStorage.getItem(operatorKey)||localStorage.getItem(legacyKey)}catch(e){}}applyResolved(resolve(s||"system"))}catch(e){}})();`;
