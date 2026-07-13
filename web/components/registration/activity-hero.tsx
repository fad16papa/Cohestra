"use client";

import { useMemo, useState } from "react";

import { ResponsiveBannerImage } from "@/components/ui/responsive-banner-image";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";

type ActivityHeroProps = {
  name: string;
  schedule: string;
  location: string;
  communityLabel: string;
  heroImageUrl?: string | null;
  showHeroImage?: boolean;
};

export function ActivityHero({
  name,
  schedule,
  location,
  communityLabel,
  heroImageUrl,
  showHeroImage = true,
}: ActivityHeroProps) {
  const resolvedHeroImageUrl = useMemo(
    () => resolveHeroImageUrl(heroImageUrl),
    [heroImageUrl]
  );
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = showHeroImage && resolvedHeroImageUrl && !imageFailed;

  return (
    <header className="space-y-4 text-center">
      {showImage ? (
        <ResponsiveBannerImage
          src={resolvedHeroImageUrl}
          variant="registration"
          className="overflow-hidden rounded-xl border border-border-warm bg-muted/30"
          onError={() => setImageFailed(true)}
          overlay={
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-black/5 dark:bg-black/25"
            />
          }
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
