"use client";

import { useEffect, useMemo, useState } from "react";

import { ResponsiveBannerImage } from "@/components/ui/responsive-banner-image";
import type { RegistrationThemePreset } from "@/lib/activities-api";
import { campaignAssetPath } from "@/lib/registration-theme-utils";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";
import { cn } from "@/lib/utils";

type ActivityHeroProps = {
  name: string;
  schedule: string;
  location: string;
  communityLabel: string;
  heroImageUrl?: string | null;
  logoAssetId?: string | null;
  preset?: RegistrationThemePreset;
  showHeroImage?: boolean;
};

export function ActivityHero({
  name,
  schedule,
  location,
  communityLabel,
  heroImageUrl,
  logoAssetId = null,
  preset = "classic",
  showHeroImage = true,
}: ActivityHeroProps) {
  const resolvedHeroImageUrl = useMemo(
    () => resolveHeroImageUrl(heroImageUrl),
    [heroImageUrl]
  );
  const logoUrl = useMemo(
    () => (logoAssetId?.trim() ? resolveHeroImageUrl(campaignAssetPath(logoAssetId.trim())) : null),
    [logoAssetId]
  );
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [resolvedHeroImageUrl]);

  const showImage =
    showHeroImage &&
    resolvedHeroImageUrl &&
    !imageFailed &&
    preset !== "compact";

  const compactHero = preset === "compact" && showHeroImage && resolvedHeroImageUrl && !imageFailed;

  return (
    <header
      className={cn(
        "space-y-4 text-center",
        preset === "immersive" && showImage && "relative"
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={communityLabel ? `${communityLabel} logo` : "Community logo"}
          className="mx-auto max-h-12 w-auto object-contain"
        />
      ) : null}

      {showImage ? (
        <ResponsiveBannerImage
          src={resolvedHeroImageUrl}
          variant="registration"
          className={cn(
            "overflow-hidden rounded-xl border border-border-warm bg-muted/30",
            preset === "immersive" && "min-h-[40vh] rounded-b-none border-b-0",
            preset === "card" && "max-h-56"
          )}
          onError={() => setImageFailed(true)}
          overlay={
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0",
                preset === "immersive"
                  ? "bg-gradient-to-b from-black/10 via-black/20 to-black/45"
                  : "bg-black/5 dark:bg-black/25"
              )}
            />
          }
        />
      ) : null}

      {compactHero ? (
        <ResponsiveBannerImage
          src={resolvedHeroImageUrl}
          variant="registration"
          className="mx-auto max-h-[120px] max-w-md overflow-hidden rounded-lg border border-border-warm bg-muted/30"
          onError={() => setImageFailed(true)}
        />
      ) : null}

      {communityLabel ? (
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          {communityLabel}
        </p>
      ) : null}
      <h1 className="text-public-hero text-text-warm">{name}</h1>
      <div className="space-y-1 text-sm text-text-muted-warm">
        {schedule ? <p>{schedule}</p> : null}
        {location ? <p>{location}</p> : null}
      </div>
    </header>
  );
}
