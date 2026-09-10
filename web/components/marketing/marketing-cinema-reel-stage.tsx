"use client";

import { useMemo } from "react";

import { MarketingCinemaRollProvider } from "@/components/marketing/marketing-cinema-roll-context";
import {
  computeReelLayerStyles,
  computeRoomBeat,
  layerStyleToCss,
  shouldMountNextLayer,
  type CinemaReelState,
} from "@/lib/marketing/cinema-reel";
import { beatCountForSlide } from "@/lib/marketing/cinema-roll";
import { PRODUCT_SLIDES, type ProductSlideId } from "@/lib/marketing/product-slides";
import { cn } from "@/lib/utils";

type MarketingCinemaReelStageProps = {
  reel: CinemaReelState;
  reducedMotion: boolean;
};

export function MarketingCinemaReelStage({
  reel,
  reducedMotion,
}: MarketingCinemaReelStageProps) {
  const { currentIndex, nextIndex, storyProgress, handoffProgress } = reel;
  const currentSlide = PRODUCT_SLIDES[currentIndex]!;
  const nextSlide = PRODUCT_SLIDES[nextIndex]!;
  const currentId = currentSlide.id as ProductSlideId;
  const nextId = nextSlide.id as ProductSlideId;
  const mountNext = shouldMountNextLayer(currentIndex);

  const layerStyles = useMemo(
    () => computeReelLayerStyles(handoffProgress, reducedMotion),
    [handoffProgress, reducedMotion]
  );

  const currentBeat = computeRoomBeat(currentId, storyProgress);
  const nextBeat = 0;

  return (
    <div
      className={cn(
        "marketing-cinema-reel-stage relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-line bg-paper shadow-[0_12px_32px_rgba(7,13,18,0.06)]",
        "[&_.marketing-cinema-reel-layer>div]:flex [&_.marketing-cinema-reel-layer>div]:h-full [&_.marketing-cinema-reel-layer>div]:min-h-0 [&_.marketing-cinema-reel-layer>div]:flex-1 [&_.marketing-cinema-reel-layer>div]:flex-col"
      )}
      data-cinema-reel-current={currentId}
      data-cinema-handoff={handoffProgress.toFixed(3)}
    >
      <div
        className="marketing-cinema-reel-layer absolute inset-0 flex min-h-0 flex-col"
        style={{
          opacity: layerStyles.current.opacity,
          transform: layerStyleToCss(layerStyles.current),
          zIndex: handoffProgress < 0.5 ? 2 : 1,
          pointerEvents: "none",
        }}
        aria-hidden={handoffProgress >= 0.5}
      >
        <MarketingCinemaRollProvider
          value={{
            activeIndex: currentIndex,
            activeId: currentId,
            chapterProgress: storyProgress,
            beat: currentBeat,
            beatCount: beatCountForSlide(currentId),
            reducedMotion,
          }}
        >
          {currentSlide.visual}
        </MarketingCinemaRollProvider>
      </div>

      {mountNext ? (
        <div
          className="marketing-cinema-reel-layer absolute inset-0 flex min-h-0 flex-col"
          style={{
            opacity: layerStyles.next.opacity,
            transform: layerStyleToCss(layerStyles.next),
            zIndex: handoffProgress >= 0.5 ? 2 : 1,
            pointerEvents: "none",
          }}
          aria-hidden={handoffProgress < 0.5}
        >
          <MarketingCinemaRollProvider
            value={{
              activeIndex: nextIndex,
              activeId: nextId,
              chapterProgress: 0,
              beat: nextBeat,
              beatCount: beatCountForSlide(nextId),
              reducedMotion,
            }}
          >
            {nextSlide.visual}
          </MarketingCinemaRollProvider>
        </div>
      ) : null}
    </div>
  );
}
