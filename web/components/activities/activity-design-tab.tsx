"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { PublicRegistrationOpen } from "@/components/registration/public-registration-open";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveBannerImage } from "@/components/ui/responsive-banner-image";
import {
  updateActivity,
  type Activity,
  type RegistrationTheme,
  type RegistrationThemePreset,
} from "@/lib/activities-api";
import { uploadBrandingAsset } from "@/lib/campaigns-api";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";
import {
  accentMeetsWcagAaOnWhiteText,
  registrationPresetLabels,
  registrationPresetOptions,
} from "@/lib/registration-theme-utils";
import { cn } from "@/lib/utils";

type ActivityDesignTabProps = {
  activity: Activity;
  onActivityUpdated: (activity: Activity) => void;
};

type PreviewViewport = "mobile" | "desktop";

function themeFromActivity(activity: Activity): RegistrationTheme {
  return (
    activity.registrationTheme ?? {
      preset: activity.resolvedRegistrationTheme.preset,
      inheritCommunityBrand: true,
      accentColor: null,
      heroImageUrl: null,
    }
  );
}

export function ActivityDesignTab({
  activity,
  onActivityUpdated,
}: ActivityDesignTabProps) {
  const { authFetch } = useAuth();
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const [draftTheme, setDraftTheme] = useState<RegistrationTheme>(() =>
    themeFromActivity(activity)
  );
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>("mobile");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraftTheme(themeFromActivity(activity));
  }, [activity.id, activity.registrationTheme, activity.resolvedRegistrationTheme.preset]);

  const isArchived = activity.status === "archived";
  const savedTheme = themeFromActivity(activity);
  const isDirty = JSON.stringify(draftTheme) !== JSON.stringify(savedTheme);

  const previewResolved = useMemo(() => {
    const inherit = draftTheme.inheritCommunityBrand;
    const communityResolved = activity.resolvedRegistrationTheme;

    let accent = draftTheme.accentColor?.trim() || null;
    let hero = draftTheme.heroImageUrl?.trim() || null;
    let logo = communityResolved.logoAssetId;

    if (inherit) {
      accent =
        accent ??
        communityResolved.accentColor ??
        activity.accentColor;
      hero =
        hero ??
        communityResolved.heroImageUrl ??
        activity.heroImageUrl;
      logo = communityResolved.logoAssetId;
    } else {
      accent = accent ?? activity.accentColor;
      hero = hero ?? activity.heroImageUrl;
      logo = null;
    }

    return {
      preset: draftTheme.preset,
      accentColor: accent,
      heroImageUrl: hero,
      logoAssetId: logo,
    };
  }, [activity, draftTheme, savedTheme]);

  const contrastOk = accentMeetsWcagAaOnWhiteText(previewResolved.accentColor);
  const heroPreviewUrl = resolveHeroImageUrl(previewResolved.heroImageUrl);

  function handleHeroUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || isArchived) {
      return;
    }

    setError(null);
    setSavedMessage(null);
    setIsUploadingHero(true);

    void uploadBrandingAsset(authFetch, file, "Registration hero override")
      .then((asset) => {
        setDraftTheme((current) => ({ ...current, heroImageUrl: asset.url }));
      })
      .catch((uploadError) => {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Could not upload hero image."
        );
      })
      .finally(() => {
        setIsUploadingHero(false);
      });
  }

  function handleSave() {
    setError(null);
    setSavedMessage(null);
    setIsSaving(true);

    void updateActivity(authFetch, activity.id, {
      name: activity.name,
      category: activity.category,
      schedule: activity.schedule,
      location: activity.location,
      communityLabel: activity.communityLabel,
      heroImageUrl: activity.heroImageUrl,
      accentColor: activity.accentColor,
      maxRegistrants: activity.maxRegistrants,
      registrationTheme: {
        preset: draftTheme.preset,
        inheritCommunityBrand: draftTheme.inheritCommunityBrand,
        accentColor: draftTheme.accentColor?.trim() || null,
        heroImageUrl: draftTheme.heroImageUrl?.trim() || null,
      },
    })
      .then((updated) => {
        onActivityUpdated(updated);
        setDraftTheme(themeFromActivity(updated));
        setSavedMessage("Design saved.");
      })
      .catch((saveError) => {
        setError(
          saveError instanceof Error ? saveError.message : "Could not save design."
        );
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-section text-text-warm">Registration design</h3>
          <p className="mt-0.5 text-sm text-text-muted-warm">
            Choose a layout preset and community inherit behavior for the public page.
          </p>
        </div>
        <Button
          type="button"
          disabled={isArchived || isSaving || isUploadingHero || !isDirty}
          onClick={handleSave}
        >
          {isSaving ? "Saving…" : "Save design"}
        </Button>
      </div>

      <div className="space-y-4">
        <Label className="block">Layout preset</Label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {registrationPresetOptions.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={isArchived}
              onClick={() => setDraftTheme((current) => ({ ...current, preset }))}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                draftTheme.preset === preset
                  ? "border-primary bg-gold-soft/40 ring-2 ring-primary/30"
                  : "border-border-warm bg-card hover:border-primary/40"
              )}
            >
              <span className="text-sm font-medium text-text-warm">
                {registrationPresetLabels[preset]}
              </span>
              <span className="mt-1 block text-xs text-text-muted-warm">
                {preset === "classic"
                  ? "Hero stack + form"
                  : preset === "card"
                    ? "Form on elevated card"
                    : preset === "immersive"
                      ? "Tall hero, form scrolls up"
                      : "Minimal hero, form-first"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4 self-start rounded-xl border border-border-warm bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="inherit-community-brand">Inherit community brand</Label>
            <input
              id="inherit-community-brand"
              type="checkbox"
              checked={draftTheme.inheritCommunityBrand}
              disabled={isArchived}
              onChange={(event) =>
                setDraftTheme((current) => ({
                  ...current,
                  inheritCommunityBrand: event.target.checked,
                }))
              }
              className="size-4 rounded border-input"
            />
          </div>
          <p className="text-xs text-text-muted-warm">
            When on, logo/accent/hero fall back to the community brand kit unless overridden
            below.
          </p>

          <div className="space-y-2">
            <Label htmlFor="design-accent-color">Accent override</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                id="design-accent-color"
                type="text"
                placeholder="#2d6a4f"
                value={draftTheme.accentColor ?? ""}
                disabled={isArchived || isSaving}
                onChange={(event) =>
                  setDraftTheme((current) => ({
                    ...current,
                    accentColor: event.target.value,
                  }))
                }
                className="max-w-[10rem]"
              />
              <input
                type="color"
                value={
                  /^#[0-9A-Fa-f]{6}$/.test(draftTheme.accentColor ?? "")
                    ? (draftTheme.accentColor as string)
                    : "#2d6a4f"
                }
                disabled={isArchived || isSaving}
                onChange={(event) =>
                  setDraftTheme((current) => ({
                    ...current,
                    accentColor: event.target.value,
                  }))
                }
                aria-label="Pick accent override"
                className="size-10 cursor-pointer rounded-lg border border-input bg-background p-1"
              />
            </div>
            {!contrastOk ? (
              <p role="status" className="text-sm text-[var(--warn,#9a6700)]">
                Low contrast on buttons — choose a darker accent or registration CTAs may
                be hard to read.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="design-hero">Hero override</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isArchived || isSaving || isUploadingHero}
                onClick={() => heroFileInputRef.current?.click()}
              >
                {isUploadingHero ? "Uploading…" : "Upload hero"}
              </Button>
              <input
                ref={heroFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                disabled={isArchived || isSaving || isUploadingHero}
                onChange={handleHeroUpload}
              />
              {draftTheme.heroImageUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isArchived || isSaving || isUploadingHero}
                  onClick={() =>
                    setDraftTheme((current) => ({ ...current, heroImageUrl: null }))
                  }
                >
                  Remove
                </Button>
              ) : null}
            </div>
            <Input
              id="design-hero"
              type="url"
              placeholder="Or paste image URL"
              value={draftTheme.heroImageUrl ?? ""}
              disabled={isArchived || isSaving || isUploadingHero}
              onChange={(event) =>
                setDraftTheme((current) => ({
                  ...current,
                  heroImageUrl: event.target.value,
                }))
              }
            />
            {heroPreviewUrl ? (
              <ResponsiveBannerImage
                src={heroPreviewUrl}
                variant="preview"
                className="max-w-md overflow-hidden rounded-lg border border-border-warm bg-muted/30"
              />
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label>Live preview</Label>
            <div className="flex gap-1 rounded-lg border border-border-warm p-1">
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium",
                  previewViewport === "mobile"
                    ? "bg-primary text-primary-foreground"
                    : "text-text-muted-warm"
                )}
                onClick={() => setPreviewViewport("mobile")}
              >
                Mobile
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium",
                  previewViewport === "desktop"
                    ? "bg-primary text-primary-foreground"
                    : "text-text-muted-warm"
                )}
                onClick={() => setPreviewViewport("desktop")}
              >
                Desktop
              </button>
            </div>
          </div>
          <div
            className={cn(
              "registration-preview-surface mx-auto overflow-hidden rounded-xl border border-border-warm bg-background p-4",
              previewViewport === "mobile" ? "max-w-[375px]" : "max-w-3xl"
            )}
          >
            <PublicRegistrationOpen
              slug={activity.slug}
              name={activity.name}
              schedule={activity.schedule}
              location={activity.location}
              communityLabel={activity.communityLabel}
              heroImageUrl={previewResolved.heroImageUrl}
              accentColor={previewResolved.accentColor}
              logoAssetId={previewResolved.logoAssetId}
              preset={previewResolved.preset as RegistrationThemePreset}
              formSchema={activity.formSchema}
              variant="preview"
            />
          </div>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {savedMessage ? (
        <p role="status" className="text-sm text-text-muted-warm">
          {savedMessage}
        </p>
      ) : null}
    </div>
  );
}
