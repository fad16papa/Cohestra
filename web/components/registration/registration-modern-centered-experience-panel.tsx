"use client";

import { useMemo, useState, type CSSProperties } from "react";

import { RegistrationActivityMetadata } from "@/components/registration/registration-activity-metadata";
import { RegistrationCapacityStatus } from "@/components/registration/registration-capacity-status";
import { ResponsiveBannerImage } from "@/components/ui/responsive-banner-image";
import { buildRegistrationCapacitySummary } from "@/lib/registration-capacity-summary";
import {
  modernCenteredStyleTokens,
  type ModernCenteredSurfaceStyle,
} from "@/lib/registration-center-style";
import { campaignAssetPath } from "@/lib/registration-theme-utils";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";
import { cn } from "@/lib/utils";

type RegistrationModernCenteredExperiencePanelProps = {
  name: string;
  schedule: string;
  location: string;
  communityLabel: string;
  heroImageUrl?: string | null;
  logoAssetId?: string | null;
  accentColor?: string | null;
  showHeroImage?: boolean;
  registrationCount?: number | null;
  maxRegistrants?: number | null;
  isRegistrationFull?: boolean;
  surfaceStyle?: ModernCenteredSurfaceStyle;
  className?: string;
};

export function RegistrationModernCenteredExperiencePanel({
  name,
  schedule,
  location,
  communityLabel,
  heroImageUrl,
  logoAssetId = null,
  accentColor = null,
  showHeroImage = true,
  registrationCount = null,
  maxRegistrants = null,
  isRegistrationFull = false,
  surfaceStyle = "modern",
  className,
}: RegistrationModernCenteredExperiencePanelProps) {
  const tokens = modernCenteredStyleTokens(surfaceStyle);
  const resolvedHeroImageUrl = useMemo(
    () => resolveHeroImageUrl(heroImageUrl),
    [heroImageUrl]
  );
  const logoUrl = useMemo(
    () =>
      logoAssetId?.trim()
        ? resolveHeroImageUrl(campaignAssetPath(logoAssetId.trim()))
        : null,
    [logoAssetId]
  );
  const [imageFailed, setImageFailed] = useState(false);

  const showImage =
    showHeroImage && resolvedHeroImageUrl && !imageFailed;

  const capacity = buildRegistrationCapacitySummary({
    registrationCount,
    maxRegistrants,
    isRegistrationFull,
  });

  const accentBandStyle =
    accentColor?.trim() && !showImage
      ? ({
          borderTopColor: accentColor,
          borderTopWidth: 3,
        } as CSSProperties)
      : undefined;

  const identityBlock = (
    <>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={communityLabel ? `${communityLabel} logo` : "Community logo"}
          className="mx-auto max-h-11 w-auto object-contain"
        />
      ) : null}

      {communityLabel ? (
        <p className={tokens.communityLabel}>{communityLabel}</p>
      ) : null}

      <h1 className={tokens.title}>{name}</h1>

      <RegistrationActivityMetadata
        schedule={schedule}
        location={location}
        className={cn("text-center sm:mx-auto", tokens.metadata)}
        rowClassName="justify-center sm:justify-start"
      />

      <div className={cn("flex w-full", tokens.capacity)}>
        <RegistrationCapacityStatus summary={capacity} />
      </div>
    </>
  );

  return (
    <header className={cn(tokens.activityBand, className)}>
      {showImage ? (
        <div className="space-y-5">
          <ResponsiveBannerImage
            key={resolvedHeroImageUrl}
            src={resolvedHeroImageUrl}
            variant="registration"
            className={tokens.heroImage}
            onError={() => setImageFailed(true)}
            overlay={
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-black/25 dark:from-black/15 dark:via-black/25 dark:to-black/40"
              />
            }
          />
          {identityBlock}
        </div>
      ) : (
        <div
          className={tokens.heroNoImageBand}
          style={accentBandStyle}
        >
          <div className="space-y-4">{identityBlock}</div>
        </div>
      )}
    </header>
  );
}
