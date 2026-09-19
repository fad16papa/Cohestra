"use client";

import { useMemo, useState, type CSSProperties } from "react";

import { RegistrationCapacityStatus } from "@/components/registration/registration-capacity-status";
import { ResponsiveBannerImage } from "@/components/ui/responsive-banner-image";
import { buildRegistrationCapacitySummary } from "@/lib/registration-capacity-summary";
import { campaignAssetPath } from "@/lib/registration-theme-utils";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";
import { cn } from "@/lib/utils";

type RegistrationPosterExperiencePanelProps = {
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
  className?: string;
};

export function RegistrationPosterExperiencePanel({
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
  className,
}: RegistrationPosterExperiencePanelProps) {
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
    accentColor?.trim()
      ? ({ borderTopColor: accentColor, borderTopWidth: 3 } as CSSProperties)
      : undefined;

  return (
    <header
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border border-border-warm bg-card shadow-sm",
        className
      )}
    >
      {showImage ? (
        <ResponsiveBannerImage
          key={resolvedHeroImageUrl}
          src={resolvedHeroImageUrl}
          variant="registration"
          className="max-h-[min(36vh,280px)] w-full rounded-none border-0 sm:max-h-[320px]"
          onError={() => setImageFailed(true)}
          overlay={
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-black/25 to-black/45"
            />
          }
        />
      ) : null}

      <div
        className={cn(
          "space-y-3 px-5 py-5 sm:px-6 sm:py-6",
          !showImage && "border-t border-primary/20 bg-surface-warm/80"
        )}
        style={!showImage ? accentBandStyle : undefined}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={communityLabel ? `${communityLabel} logo` : "Community logo"}
            className="max-h-10 w-auto object-contain"
          />
        ) : null}

        {communityLabel ? (
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            {communityLabel}
          </p>
        ) : null}

        <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-text-warm sm:text-3xl">
          {name}
        </h1>

        <div className="space-y-1.5 text-sm leading-relaxed text-text-muted-warm">
          {schedule ? <p>{schedule}</p> : null}
          {location ? <p>{location}</p> : null}
        </div>

        <RegistrationCapacityStatus summary={capacity} />
      </div>
    </header>
  );
}
