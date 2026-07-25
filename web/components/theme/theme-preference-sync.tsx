"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import { useAuth } from "@/components/auth/auth-provider";
import {
  isPublicLocalThemePath,
  normalizeThemePreference,
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

  return null;
}
