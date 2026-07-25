"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import { useAuth } from "@/components/auth/auth-provider";
import {
  effectivePathname,
  isPublicLocalThemePath,
  normalizeThemePreference,
} from "@/components/theme/theme-config";

export function ThemePreferenceSync() {
  const pathname = effectivePathname(usePathname());
  const { status, profile } = useAuth();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (status !== "authenticated" || !profile) {
      return;
    }

    if (!pathname || isPublicLocalThemePath(pathname)) {
      return;
    }

    setTheme(normalizeThemePreference(profile.themePreference));
    // setTheme is stable; omit from deps to avoid re-sync loops after local toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only on auth/path/preference
  }, [pathname, profile?.themePreference, status]);

  return null;
}
