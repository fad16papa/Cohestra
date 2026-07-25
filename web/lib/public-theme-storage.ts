import {
  normalizeThemePreference,
  PUBLIC_THEME_SESSION_KEY,
  type ThemePreference,
} from "@/components/theme/theme-config";

const DARK_CLASS = "dark";

export function readPublicThemeSession(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    return normalizeThemePreference(sessionStorage.getItem(PUBLIC_THEME_SESSION_KEY));
  } catch {
    return "system";
  }
}

export function writePublicThemeSession(theme: ThemePreference): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(PUBLIC_THEME_SESSION_KEY, theme);
  } catch {
    // ignore quota / privacy mode
  }
}

export function resolvePublicTheme(
  theme: ThemePreference
): "light" | "dark" {
  if (theme === "dark") {
    return "dark";
  }

  if (theme === "light") {
    return "light";
  }

  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Apply resolved light/dark to the document root (used for public surfaces). */
export function applyResolvedThemeToDocument(resolved: "light" | "dark"): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle(DARK_CLASS, resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

export function applyPublicThemeToDocument(theme: ThemePreference): void {
  applyResolvedThemeToDocument(resolvePublicTheme(theme));
}
