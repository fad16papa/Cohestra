"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import {
  migrateLegacyThemeStorage,
  resolveThemeStorageKey,
} from "./theme-config";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const storageKey = resolveThemeStorageKey(pathname);

  useEffect(() => {
    migrateLegacyThemeStorage(storageKey);
  }, [storageKey]);

  return (
    <NextThemesProvider
      key={storageKey}
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={storageKey}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
