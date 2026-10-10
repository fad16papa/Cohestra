"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { ThemePreference } from "@/components/theme/theme-config";

type PublicThemeContextValue = {
  isPublicSurface: boolean;
  publicTheme: ThemePreference;
  setPublicTheme: (theme: ThemePreference) => void;
};

const PublicThemeContext = createContext<PublicThemeContextValue>({
  isPublicSurface: false,
  publicTheme: "system",
  setPublicTheme: () => undefined,
});

export function PublicThemeContextProvider({
  value,
  children,
}: {
  value: PublicThemeContextValue;
  children: ReactNode;
}) {
  return (
    <PublicThemeContext.Provider value={value}>
      {children}
    </PublicThemeContext.Provider>
  );
}

export function usePublicTheme() {
  return useContext(PublicThemeContext);
}
