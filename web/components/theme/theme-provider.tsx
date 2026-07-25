"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { PublicThemeContextProvider } from "@/components/theme/public-theme-context";
import {
  readPublicThemeSession,
  resolvePublicTheme,
  writePublicThemeSession,
} from "@/lib/public-theme-storage";
import {
  effectivePathname,
  isPublicLocalThemePath,
  migrateLegacyThemeStorage,
  OPERATOR_THEME_STORAGE_KEY,
  type ThemePreference,
} from "./theme-config";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = effectivePathname(usePathname());
  const isPublicSurface = isPublicLocalThemePath(pathname);
  const [publicTheme, setPublicThemeState] = useState<ThemePreference>(() =>
    readPublicThemeSession()
  );

  const setPublicTheme = useCallback((next: ThemePreference) => {
    setPublicThemeState(next);
    writePublicThemeSession(next);
  }, []);

  const forcedTheme = isPublicSurface
    ? resolvePublicTheme(publicTheme)
    : undefined;

  useEffect(() => {
    migrateLegacyThemeStorage();
  }, []);

  useEffect(() => {
    if (!isPublicSurface || publicTheme !== "system") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setPublicThemeState("system");
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [isPublicSurface, publicTheme]);

  const publicContext = useMemo(
    () => ({
      isPublicSurface,
      publicTheme,
      setPublicTheme,
    }),
    [isPublicSurface, publicTheme, setPublicTheme]
  );

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={OPERATOR_THEME_STORAGE_KEY}
      forcedTheme={forcedTheme}
      disableTransitionOnChange
    >
      <PublicThemeContextProvider value={publicContext}>
        {children}
      </PublicThemeContextProvider>
    </NextThemesProvider>
  );
}
