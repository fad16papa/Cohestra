/** Shared theme config — inline script must stay in sync with next-themes storage key. */
export const THEME_STORAGE_KEY = "theme";

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

/** Public surfaces use local next-themes storage only — not operator profile preference. */
export function isPublicLocalThemePath(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  return pathname === "/"
    || pathname === "/login"
    || pathname.startsWith("/register")
    || pathname === "/forgot-password"
    || pathname === "/reset-password";
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

export const themeInitScript = `(function(){try{var d=document.documentElement,c="dark",s=localStorage.getItem("${THEME_STORAGE_KEY}");var m=window.matchMedia("(prefers-color-scheme: dark)");function norm(v){return v==="light"||v==="dark"||v==="system"?v:"system"}function apply(t){var theme=norm(t);var isDark=theme==="dark"||(theme==="system"&&m.matches);if(isDark){d.classList.add(c)}else{d.classList.remove(c)}}apply(s||"system")}catch(e){}})();`;
