"use client";

import { useMemo, useState } from "react";

import { ResponsiveBannerImage } from "@/components/ui/responsive-banner-image";
import {
  buildRegistrationCapacitySummary,
  type RegistrationCapacitySummary,
} from "@/lib/registration-capacity-summary";
import { campaignAssetPath } from "@/lib/registration-theme-utils";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";
import { cn } from "@/lib/utils";

type RegistrationSplitExperiencePanelProps = {
  name: string;
  schedule: string;
  location: string;
  communityLabel: string;
  heroImageUrl?: string | null;
  logoAssetId?: string | null;
  showHeroImage?: boolean;
  registrationCount?: number | null;
  maxRegistrants?: number | null;
  isRegistrationFull?: boolean;
  className?: string;
};

function CapacityStatus({ summary }: { summary: RegistrationCapacitySummary }) {
  if (summary.kind === "hidden") {
    return null;
  }

  if (summary.kind === "going-only") {
    return (
      <p className="text-sm font-medium text-text-warm" aria-live="polite">
        {summary.label}
      </p>
    );
  }

  if (summary.kind === "full") {
    return (
      <p className="text-sm font-medium text-destructive" aria-live="polite">
        {summary.label}
      </p>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-warm"
      aria-live="polite"
    >
      <span className="font-medium">{summary.goingLabel}</span>
      <span className="text-text-muted-warm" aria-hidden>
        ·
      </span>
      <span>{summary.spotsLabel}</span>
    </div>
  );
}

export function RegistrationSplitExperiencePanel({
  name,
  schedule,
  location,
  communityLabel,
  heroImageUrl,
  logoAssetId = null,
  showHeroImage = true,
  registrationCount = null,
  maxRegistrants = null,
  isRegistrationFull = false,
  className,
}: RegistrationSplitExperiencePanelProps) {
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

  return (
    <aside
      className={cn(
        "flex min-w-0 flex-col gap-4 text-left lg:sticky lg:top-6 lg:self-start",
        className
      )}
    >
      {showImage ? (
        <ResponsiveBannerImage
          key={resolvedHeroImageUrl}
          src={resolvedHeroImageUrl}
          variant="registration"
          className="max-h-[min(42vh,320px)] w-full overflow-hidden rounded-xl border border-border-warm bg-muted/30 lg:max-h-[360px]"
          onError={() => setImageFailed(true)}
          overlay={
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-black/5 dark:bg-black/20"
            />
          }
        />
      ) : null}

      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={communityLabel ? `${communityLabel} logo` : "Community logo"}
          className="max-h-10 w-auto object-contain"
        />
      ) : null}

      {communityLabel ? (
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          {communityLabel}
        </p>
      ) : null}

      <h1 className="text-balance text-2xl font-semibold leading-tight text-text-warm sm:text-3xl">
        {name}
      </h1>

      <div className="space-y-1 text-sm text-text-muted-warm">
        {schedule ? <p>{schedule}</p> : null}
        {location ? <p>{location}</p> : null}
      </div>

      <CapacityStatus summary={capacity} />
    </aside>
  );
}
