"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";

import { useAuth } from "@/components/auth/auth-provider";
import { usePersistedThemePreference } from "@/components/theme/use-persisted-theme-preference";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateAppearanceSettings } from "@/lib/auth-api";
import {
  brandAccentPresets,
  buildBrandAccentStyle,
  isValidBrandAccentColor,
  normalizeBrandAccentColor,
  presetIdForColor,
  type BrandAccentPresetId,
} from "@/lib/brand-accent";
import { cn } from "@/lib/utils";

export function BrandAccentSection() {
  const { authFetch, applyProfile, profile } = useAuth();
  const isTenantAdmin = profile?.roles.includes("TenantAdmin") ?? false;
  const { selected: themePreference } = usePersistedThemePreference();
  const { resolvedTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customHex, setCustomHex] = useState(
    () => profile?.brandAccentColor ?? ""
  );

  useEffect(() => {
    setCustomHex(profile?.brandAccentColor ?? "");
  }, [profile?.brandAccentColor]);

  const savedColor = profile?.brandAccentColor ?? null;
  const activePreset = presetIdForColor(savedColor);
  const previewColor =
    customHex.trim() && isValidBrandAccentColor(customHex)
      ? normalizeBrandAccentColor(customHex)
      : savedColor;
  const previewStyle = buildBrandAccentStyle(
    previewColor,
    resolvedTheme === "dark"
  );

  const persistAccent = useCallback(
    async (nextAccent: string | null) => {
      setError(null);
      setIsSaving(true);

      try {
        const updated = await updateAppearanceSettings(authFetch, {
          themePreference,
          brandAccentColor: nextAccent,
        });
        applyProfile(updated);
        setCustomHex(updated.brandAccentColor ?? "");
        return { ok: true as const };
      } catch (saveError) {
        const message =
          saveError instanceof Error
            ? saveError.message
            : "Could not save brand accent.";
        setError(message);
        return { ok: false as const, message };
      } finally {
        setIsSaving(false);
      }
    },
    [applyProfile, authFetch, themePreference]
  );

  async function selectPreset(presetId: BrandAccentPresetId) {
    const preset = brandAccentPresets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    setCustomHex(preset.hex);
    await persistAccent(preset.hex);
  }

  async function applyCustomHex() {
    const normalized = normalizeBrandAccentColor(customHex);
    if (!normalized || !isValidBrandAccentColor(normalized)) {
      setError("Enter a valid hex color like #2d6a4f.");
      return;
    }

    await persistAccent(normalized);
  }

  async function resetToDefault() {
    setCustomHex("");
    await persistAccent(null);
  }

  if (!isTenantAdmin) {
    return null;
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-section text-text-warm">Brand accent</h2>
        <p className="mt-1 text-sm text-text-muted-warm">
          Personalize buttons, links, dashboard highlights, and toast accents.
          Lead status colors and error states stay fixed for clarity.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-text-warm">Presets</p>
            <div className="flex flex-wrap gap-2">
              {brandAccentPresets.map((preset) => {
                const isActive = activePreset === preset.id;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={isSaving}
                    aria-pressed={isActive}
                    onClick={() => void selectPreset(preset.id)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                      isActive
                        ? "border-primary bg-primary/5 text-text-warm"
                        : "border-border-warm bg-card text-text-muted-warm hover:bg-muted/50"
                    )}
                  >
                    <span
                      className="size-4 rounded-full border border-border-warm"
                      style={{ backgroundColor: preset.hex }}
                      aria-hidden
                    />
                    {preset.label}
                    {isActive ? (
                      <Check className="size-4 text-primary" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="brand-accent-custom"
              className="text-sm font-medium text-text-warm"
            >
              Custom hex
            </label>
            <div className="flex max-w-md flex-col gap-2 sm:flex-row">
              <Input
                id="brand-accent-custom"
                value={customHex}
                disabled={isSaving}
                placeholder="#2d6a4f"
                onChange={(event) => {
                  setCustomHex(event.target.value);
                  setError(null);
                }}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={isSaving}
                onClick={() => void applyCustomHex()}
              >
                Apply custom
              </Button>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            disabled={isSaving || !savedColor}
            onClick={() => void resetToDefault()}
            className="px-0 text-text-muted-warm hover:text-text-warm"
          >
            Reset to default forest
          </Button>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div
          className="rounded-xl border border-border-warm bg-card p-4"
          style={previewStyle}
        >
          <p className="text-sm font-medium text-text-warm">Live preview</p>
          <p className="mt-1 text-xs text-text-muted-warm">
            Accent tier only — status badges below keep semantic colors.
          </p>
          <div className="mt-4 space-y-3">
            <Button type="button" size="sm">
              Primary action
            </Button>
            <div className="flex items-center gap-2 rounded-lg border border-l-4 border-l-primary border-border-warm bg-background px-3 py-2 text-sm text-text-warm shadow-sm">
              <Sparkles className="size-4 text-primary" aria-hidden />
              Saved — toast accent preview
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              <span
                className="inline-flex size-6 items-center justify-center rounded-full bg-primary/15"
                aria-hidden
              >
                AL
              </span>
              Dashboard icon tile
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-full bg-[var(--status-new)] px-2 py-0.5 text-xs text-[var(--status-new-foreground)]">
                New
              </span>
              <span className="rounded-full bg-[var(--status-active)] px-2 py-0.5 text-xs text-[var(--status-active-foreground)]">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
