"use client";

import { useState } from "react";

import {
  themeOptionLabels,
  themePreferences,
  type ThemePreference,
} from "@/components/theme/theme-config";
import { usePersistedThemePreference } from "@/components/theme/use-persisted-theme-preference";
import { cn } from "@/lib/utils";

const appearanceHelperText: Record<ThemePreference, string> = {
  light: "Always use light appearance.",
  dark: "Always use dark appearance.",
  system: "Match your device settings.",
};

export function AppearanceSection() {
  const { selected, persistThemePreference, isSaving } =
    usePersistedThemePreference();
  const [error, setError] = useState<string | null>(null);

  async function selectPreference(next: ThemePreference) {
    setError(null);
    const result = await persistThemePreference(next);
    if (!result.ok) {
      setError(result.message);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-section text-text-warm">Appearance</h2>
        <p className="mt-1 text-sm text-text-muted-warm">
          Choose how Cohestra looks on this device. Changes sync with the
          top-bar theme control instantly.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Appearance preference"
        className="inline-flex w-full max-w-md flex-col gap-2 rounded-lg border border-border-warm bg-card p-1 sm:flex-row"
      >
        {themePreferences.map((option) => {
          const isActive = selected === option;

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isActive}
              disabled={isSaving && !isActive}
              onClick={() => void selectPreference(option)}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {themeOptionLabels[option]}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-text-muted-warm">
        {appearanceHelperText[selected]}
      </p>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
