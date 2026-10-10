"use client";

import { useCallback, useState } from "react";
import { useTheme } from "next-themes";

import { useAuth } from "@/components/auth/auth-provider";
import { updateAppearanceSettings } from "@/lib/auth-api";

import {
  type ThemePreference,
} from "./theme-config";

export function resolveThemePreference(
  theme: string | undefined,
  profilePreference: ThemePreference | undefined
): ThemePreference {
  if (theme === "light" || theme === "dark" || theme === "system") {
    return theme;
  }

  return profilePreference ?? "system";
}

export type PersistThemeResult =
  | { ok: true }
  | { ok: false; message: string };

export function usePersistedThemePreference() {
  const { authFetch, applyProfile, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [pendingTheme, setPendingTheme] = useState<ThemePreference | null>(null);

  const selected =
    pendingTheme ?? resolveThemePreference(theme, profile?.themePreference);

  const persistThemePreference = useCallback(
    async (next: ThemePreference): Promise<PersistThemeResult> => {
      const previous = resolveThemePreference(theme, profile?.themePreference);

      if (next === previous && profile?.themePreference === next) {
        setTheme(next);
        return { ok: true };
      }

      setPendingTheme(next);
      setTheme(next);
      setIsSaving(true);

      try {
        const updated = await updateAppearanceSettings(authFetch, {
          themePreference: next,
          brandAccentColor: profile?.brandAccentColor ?? null,
        });
        applyProfile(updated);
        return { ok: true };
      } catch (saveError) {
        setPendingTheme(null);
        setTheme(previous);
        return {
          ok: false,
          message:
            saveError instanceof Error
              ? saveError.message
              : "Could not save appearance preference.",
        };
      } finally {
        setIsSaving(false);
        setPendingTheme(null);
      }
    },
    [applyProfile, authFetch, profile?.brandAccentColor, profile?.themePreference, setTheme, theme]
  );

  return { selected, persistThemePreference, isSaving };
}
