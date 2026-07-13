"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveBannerImage } from "@/components/ui/responsive-banner-image";
import { updateActivity, type Activity } from "@/lib/activities-api";
import { uploadCampaignAsset } from "@/lib/campaigns-api";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";

type ActivityBrandingPanelProps = {
  activity: Activity;
  onActivityUpdated: (activity: Activity) => void;
};

const CAMPAIGN_ASSET_PREFIX = "/api/v1/public/campaign-assets/";

function heroUrlCompareKey(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }

  const lower = trimmed.toLowerCase();
  const prefixIndex = lower.indexOf(CAMPAIGN_ASSET_PREFIX);
  if (prefixIndex >= 0) {
    return trimmed.slice(prefixIndex);
  }

  try {
    const parsed = new URL(trimmed);
    const pathIndex = parsed.pathname
      .toLowerCase()
      .indexOf(CAMPAIGN_ASSET_PREFIX);
    if (pathIndex >= 0) {
      return parsed.pathname.slice(pathIndex);
    }
  } catch {
    // Non-URL strings compare as-is.
  }

  return trimmed;
}

export function ActivityBrandingPanel({
  activity,
  onActivityUpdated,
}: ActivityBrandingPanelProps) {
  const { authFetch } = useAuth();
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const [heroImageUrl, setHeroImageUrl] = useState(activity.heroImageUrl ?? "");
  const [accentColor, setAccentColor] = useState(activity.accentColor ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setHeroImageUrl(activity.heroImageUrl ?? "");
    setAccentColor(activity.accentColor ?? "");
  }, [activity.id, activity.heroImageUrl, activity.accentColor]);

  const isArchived = activity.status === "archived";
  const isDirty =
    heroUrlCompareKey(heroImageUrl) !==
      heroUrlCompareKey(activity.heroImageUrl ?? "") ||
    accentColor.trim() !== (activity.accentColor ?? "").trim();

  function handleHeroUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || isArchived) {
      return;
    }

    setError(null);
    setSavedMessage(null);
    setIsUploadingHero(true);

    void uploadCampaignAsset(authFetch, file, "Activity hero image")
      .then((asset) => {
        setHeroImageUrl(asset.url);
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

  function saveBranding(nextHeroImageUrl: string, nextAccentColor: string) {
    setError(null);
    setSavedMessage(null);
    setIsSaving(true);

    return updateActivity(authFetch, activity.id, {
      name: activity.name,
      category: activity.category,
      schedule: activity.schedule,
      location: activity.location,
      communityLabel: activity.communityLabel,
      heroImageUrl: nextHeroImageUrl.trim() || null,
      accentColor: nextAccentColor.trim() || null,
    })
      .then((updated) => {
        onActivityUpdated(updated);
        setHeroImageUrl(updated.heroImageUrl ?? "");
        setAccentColor(updated.accentColor ?? "");
        setSavedMessage("Public branding saved.");
      })
      .catch((saveError) => {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Could not save public branding."
        );
        throw saveError;
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  const previewHeroUrl = resolveHeroImageUrl(heroImageUrl.trim() || null);

  function handleSave() {
    void saveBranding(heroImageUrl, accentColor);
  }

  function handleClearHero() {
    setHeroImageUrl("");
  }

  return (
    <Card className="border-border-warm">
      <CardHeader>
        <CardTitle className="text-section text-text-warm">
          Public branding
        </CardTitle>
        <CardDescription className="text-text-muted-warm">
          Optional hero image and accent color for the public registration page
          and confirmation email. Upload an image or paste a public URL.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="activity-hero-image-url">Hero image</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isArchived || isSaving || isUploadingHero}
              onClick={() => heroFileInputRef.current?.click()}
            >
              {isUploadingHero ? "Uploading…" : "Upload image"}
            </Button>
            <input
              ref={heroFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              disabled={isArchived || isSaving || isUploadingHero}
              onChange={handleHeroUpload}
            />
            {heroImageUrl ? (
              <Button
                type="button"
                variant="ghost"
                disabled={isArchived || isSaving || isUploadingHero}
                onClick={handleClearHero}
              >
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-text-muted-warm">Or paste an image URL</p>
          <Input
            id="activity-hero-image-url"
            type="url"
            placeholder="https://example.com/cover.jpg"
            value={heroImageUrl}
            disabled={isArchived || isSaving || isUploadingHero}
            onChange={(event) => setHeroImageUrl(event.target.value)}
          />
          {previewHeroUrl ? (
            <ResponsiveBannerImage
              src={previewHeroUrl}
              variant="preview"
              className="max-w-md overflow-hidden rounded-lg border border-border-warm bg-muted/30"
            />
          ) : null}
          <p className="text-xs text-text-muted-warm">
            Shown at its natural aspect ratio on the registration page and in
            event listings. After upload or pasting a URL, click Save branding.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="activity-accent-color">Accent color</Label>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              id="activity-accent-color"
              type="text"
              placeholder="#2d6a4f"
              value={accentColor}
              disabled={isArchived || isSaving}
              onChange={(event) => setAccentColor(event.target.value)}
              className="max-w-[10rem]"
            />
            <input
              type="color"
              value={
                /^#[0-9A-Fa-f]{6}$/.test(accentColor) ? accentColor : "#2d6a4f"
              }
              disabled={isArchived || isSaving}
              onChange={(event) => setAccentColor(event.target.value)}
              aria-label="Pick accent color"
              className="size-10 cursor-pointer rounded-lg border border-input bg-background p-1"
            />
          </div>
          <p className="text-xs text-text-muted-warm">
            Applies to buttons and links on the public registration page.
          </p>
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

        <Button
          type="button"
          disabled={isArchived || isSaving || isUploadingHero || !isDirty}
          onClick={handleSave}
        >
          {isSaving ? "Saving…" : "Save branding"}
        </Button>
      </CardContent>
    </Card>
  );
}
