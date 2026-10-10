/** Compatibility keys from the superseded Light/Dark/System system. They are ignored. */
export const LEGACY_THEME_STORAGE_KEY = "theme";
export const OPERATOR_THEME_STORAGE_KEY = "cohestra-theme-operator";
export const PUBLIC_THEME_SESSION_KEY = "cohestra-theme-public-session";
export const PUBLIC_THEME_STORAGE_KEY = "cohestra-theme-public";
export const THEME_STORAGE_KEY = LEGACY_THEME_STORAGE_KEY;

/** API/DB still accept historical values. They do not control application appearance. */
export const themePreferences = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof themePreferences)[number];

export function normalizeThemePreference(
  value: string | null | undefined
): ThemePreference {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }

  return "light";
}

/** First paint: always light. Never read storage or prefers-color-scheme. */
export const themeInitScript =
  '(function(){try{var d=document.documentElement;d.classList.remove("dark");d.style.colorScheme="light";}catch(e){}})();';
