"use client";

import { useMemo } from "react";

import {
  computeReelLayerStyles,
  layerStyleToCss,
  type CinemaReelState,
} from "@/lib/marketing/cinema-reel";
import { PRODUCT_SLIDES } from "@/lib/marketing/product-slides";
import { cn } from "@/lib/utils";

type MarketingCinemaCaptionStripProps = {
  reel: CinemaReelState;
  reducedMotion: boolean;
};

function CaptionContent({ index }: { index: number }) {
  const slide = PRODUCT_SLIDES[index]!;
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-cinema">
          {slide.feeling}
        </p>
        <h3 className="font-[family-name:var(--font-fraunces)] text-[clamp(1.15rem,1.6vw,1.45rem)] font-medium leading-tight tracking-[-0.02em] text-ink">
          {slide.feelingLine}
        </h3>
        <p className="max-w-3xl text-sm leading-snug text-stone-cinema">{slide.scene}</p>
      </div>
      <ul className="sr-only">
        {slide.outcomes.map((outcome) => (
          <li key={outcome}>{outcome}</li>
        ))}
      </ul>
    </>
  );
}

export function MarketingCinemaCaptionStrip({
  reel,
  reducedMotion,
}: MarketingCinemaCaptionStripProps) {
  const { currentIndex, nextIndex, handoffProgress } = reel;
  const showNext = currentIndex < nextIndex;

  const styles = useMemo(
    () => computeReelLayerStyles(handoffProgress, reducedMotion),
    [handoffProgress, reducedMotion]
  );

  return (
    <div className="relative shrink-0 min-h-[3.25rem] border-b border-line/70 pb-2.5">
      <div
        className={cn("marketing-cinema-reel-caption", !reducedMotion && "will-change-transform")}
        style={{
          opacity: styles.current.opacity,
          transform: reducedMotion ? undefined : layerStyleToCss({
            ...styles.current,
            translateY: styles.current.translateY * 0.5,
            scale: 1,
          }),
        }}
        aria-hidden={handoffProgress >= 0.5}
      >
        <CaptionContent index={currentIndex} />
      </div>
      {showNext ? (
        <div
          className={cn(
            "marketing-cinema-reel-caption absolute inset-x-0 top-0",
            !reducedMotion && "will-change-transform"
          )}
          style={{
            opacity: styles.next.opacity,
            transform: reducedMotion ? undefined : layerStyleToCss({
              ...styles.next,
              translateY: styles.next.translateY * 0.5,
              scale: 1,
            }),
          }}
          aria-hidden={handoffProgress < 0.5}
        >
          <CaptionContent index={nextIndex} />
        </div>
      ) : null}
    </div>
  );
}
