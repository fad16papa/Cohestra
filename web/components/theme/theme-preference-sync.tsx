"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import { useAuth } from "@/components/auth/auth-provider";
import {
  isPublicLocalThemePath,
  normalizeThemePreference,
  THEME_STORAGE_KEY,
} from "@/components/theme/theme-config";

export function ThemePreferenceSync() {
  const pathname = usePathname();
  const { status, profile } = useAuth();
  const { setTheme } = useTheme();

  // Sync server preference on login and when profile.themePreference changes only.
  // Do not depend on the whole profile object — other settings updates would re-run
  // this effect and fight an in-flight local theme change.
  // Public registration/login pages keep local Appearance choices (next-themes storage).
  useEffect(() => {
    if (status !== "authenticated" || !profile) {
      return;
    }

    if (isPublicLocalThemePath(pathname)) {
      return;
    }

    setTheme(normalizeThemePreference(profile.themePreference));
    // setTheme is stable; omit from deps to avoid re-sync loops after local toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only on auth/path/preference
  }, [pathname, profile?.themePreference, status]);

  // Another tab on the same tenant origin (e.g. live site "/") can write localStorage.
  // Restore the operator profile preference while on dashboard routes.
  useEffect(() => {
    if (status !== "authenticated" || !profile) {
      return;
    }

    if (isPublicLocalThemePath(pathname)) {
      return;
    }

    const preference = normalizeThemePreference(profile.themePreference);

    function onStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }

      setTheme(preference);
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore profile theme on cross-tab writes
  }, [pathname, profile?.themePreference, status]);

  return null;
}
