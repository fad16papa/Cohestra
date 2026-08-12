"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/auth-provider";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveBannerImage } from "@/components/ui/responsive-banner-image";
import { uploadBrandingAsset } from "@/lib/campaigns-api";
import { updateCommunity, type CommunityDetail } from "@/lib/communities-api";
import { isCoreOrAbove } from "@/lib/shell/tenant-shell-api";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";

type CommunityBrandKitPanelProps = {
  community: CommunityDetail;
  onCommunityUpdated: (community: CommunityDetail) => void;
};

function campaignAssetPath(assetId: string): string {
  return `/api/v1/public/campaign-assets/${assetId}`;
}

export function CommunityBrandKitPanel({
  community,
  onCommunityUpdated,
}: CommunityBrandKitPanelProps) {
  const { authFetch } = useAuth();
  const { shell } = useTenantShell();
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const canUploadLogo = isCoreOrAbove(shell?.plan ?? "Basic");

  const [logoAssetId, setLogoAssetId] = useState(community.logoAssetId ?? "");
  const [accentColor, setAccentColor] = useState(community.accentColor ?? "");
  const [defaultHeroImageUrl, setDefaultHeroImageUrl] = useState(
    community.defaultHeroImageUrl ?? ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setLogoAssetId(community.logoAssetId ?? "");
    setAccentColor(community.accentColor ?? "");
    setDefaultHeroImageUrl(community.defaultHeroImageUrl ?? "");
  }, [
    community.id,
    community.logoAssetId,
    community.accentColor,
    community.defaultHeroImageUrl,
  ]);

  const isDirty =
    logoAssetId.trim() !== (community.logoAssetId ?? "").trim() ||
    accentColor.trim() !== (community.accentColor ?? "").trim() ||
    defaultHeroImageUrl.trim() !== (community.defaultHeroImageUrl ?? "").trim();

  function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !canUploadLogo) {
      return;
    }

    setError(null);
    setSavedMessage(null);
    setIsUploadingLogo(true);

    void uploadBrandingAsset(authFetch, file, "Community logo")
      .then((asset) => {
        setLogoAssetId(asset.id);
      })
      .catch((uploadError) => {
        setError(
          uploadError instanceof Error ? uploadError.message : "Could not upload logo."
        );
      })
      .finally(() => {
        setIsUploadingLogo(false);
      });
  }

  function handleHeroUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setError(null);
    setSavedMessage(null);
    setIsUploadingHero(true);

    void uploadBrandingAsset(authFetch, file, "Community default hero")
      .then((asset) => {
        setDefaultHeroImageUrl(asset.url);
      })
      .catch((uploadError) => {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Could not upload default hero."
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

    void updateCommunity(authFetch, community.id, {
      name: community.name,
      brandKitIncluded: true,
      logoAssetId: logoAssetId.trim() || null,
      accentColor: accentColor.trim() || null,
      defaultHeroImageUrl: defaultHeroImageUrl.trim() || null,
    })
      .then((updated) => {
        onCommunityUpdated(updated);
        setLogoAssetId(updated.logoAssetId ?? "");
        setAccentColor(updated.accentColor ?? "");
        setDefaultHeroImageUrl(updated.defaultHeroImageUrl ?? "");
        setSavedMessage("Brand kit saved.");
      })
      .catch((saveError) => {
        setError(
          saveError instanceof Error ? saveError.message : "Could not save brand kit."
        );
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  const logoPreviewUrl = logoAssetId.trim()
    ? resolveHeroImageUrl(campaignAssetPath(logoAssetId.trim()))
    : null;
  const heroPreviewUrl = resolveHeroImageUrl(defaultHeroImageUrl.trim() || null);

  return (
    <section className="space-y-5 rounded-xl border border-border-warm bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-section text-text-warm">Brand kit</h3>
          <p className="mt-0.5 text-sm text-text-muted-warm">
            Activities in this community can inherit logo, accent, and default hero.
          </p>
        </div>
        <Button
          type="button"
          disabled={isSaving || isUploadingLogo || isUploadingHero || !isDirty}
          onClick={handleSave}
        >
          {isSaving ? "Saving…" : "Save brand kit"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <Label htmlFor="community-logo">Logo</Label>
          {!canUploadLogo ? (
            <p className="text-sm text-text-muted-warm">
              Upgrade to{" "}
              <Link href="/settings/billing" className="text-accent underline-offset-2 hover:underline">
                Core
              </Link>{" "}
              to add your community logo.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSaving || isUploadingLogo}
                onClick={() => logoFileInputRef.current?.click()}
              >
                {isUploadingLogo ? "Uploading…" : "Upload logo"}
              </Button>
              <input
                ref={logoFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                disabled={isSaving || isUploadingLogo}
                onChange={handleLogoUpload}
              />
              {logoAssetId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSaving || isUploadingLogo}
                  onClick={() => setLogoAssetId("")}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          )}
          {logoPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoPreviewUrl}
              alt={`${community.name} logo`}
              className="max-h-12 w-auto object-contain"
            />
          ) : null}
        </div>

        <div className="space-y-3">
          <Label htmlFor="community-accent-color">Accent color</Label>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              id="community-accent-color"
              type="text"
              placeholder="#2d6a4f"
              value={accentColor}
              disabled={isSaving}
              onChange={(event) => setAccentColor(event.target.value)}
              className="max-w-[10rem]"
            />
            <input
              type="color"
              value={
                /^#[0-9A-Fa-f]{6}$/.test(accentColor) ? accentColor : "#2d6a4f"
              }
              disabled={isSaving}
              onChange={(event) => setAccentColor(event.target.value)}
              aria-label="Pick accent color"
              className="size-10 cursor-pointer rounded-lg border border-input bg-background p-1"
            />
          </div>
        </div>

        <div className="space-y-3 lg:col-span-2">
          <Label htmlFor="community-default-hero">Default hero image</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving || isUploadingHero}
              onClick={() => heroFileInputRef.current?.click()}
            >
              {isUploadingHero ? "Uploading…" : "Upload hero"}
            </Button>
            <input
              ref={heroFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              disabled={isSaving || isUploadingHero}
              onChange={handleHeroUpload}
            />
            {defaultHeroImageUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSaving || isUploadingHero}
                onClick={() => setDefaultHeroImageUrl("")}
              >
                Remove
              </Button>
            ) : null}
          </div>
          <Input
            id="community-default-hero"
            type="url"
            placeholder="Or paste image URL"
            value={defaultHeroImageUrl}
            disabled={isSaving || isUploadingHero}
            onChange={(event) => setDefaultHeroImageUrl(event.target.value)}
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
    </section>
  );
}
