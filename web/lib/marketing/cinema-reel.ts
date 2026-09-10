import {
  beatCountForSlide,
  computeBeatIndex,
  computeRawChapter,
  clamp,
} from "@/lib/marketing/cinema-roll";
import { PRODUCT_SLIDE_COUNT, type ProductSlideId } from "@/lib/marketing/product-slides";

/** Room story occupies 0→HANDOFF; remainder cross-fades into next room. */
export const CINEMA_HANDOFF_START = 0.68;

export type CinemaReelDirection = "up" | "down" | "none";

export type CinemaReelState = {
  cinemaProgress: number;
  rawChapter: number;
  currentIndex: number;
  nextIndex: number;
  roomProgress: number;
  storyProgress: number;
  handoffProgress: number;
};

export type CinemaReelLayerStyle = {
  opacity: number;
  translateY: number;
  scale: number;
};

export function computeRoomProgress(rawChapter: number, chapterIndex: number): number {
  return clamp(rawChapter - chapterIndex, 0, 1);
}

/** Map room progress to internal story timeline (excludes handoff tail). */
export function computeStoryProgress(roomProgress: number): number {
  if (roomProgress >= CINEMA_HANDOFF_START) {
    return 1;
  }
  return roomProgress / CINEMA_HANDOFF_START;
}

/** Cross-room blend progress within the handoff tail of a chapter. */
export function computeHandoffProgress(roomProgress: number): number {
  if (roomProgress <= CINEMA_HANDOFF_START) {
    return 0;
  }
  return clamp(
    (roomProgress - CINEMA_HANDOFF_START) / (1 - CINEMA_HANDOFF_START),
    0,
    1
  );
}

export function computeCinemaReelState(
  cinemaProgress: number,
  slideCount: number = PRODUCT_SLIDE_COUNT
): CinemaReelState {
  const rawChapter = computeRawChapter(cinemaProgress, slideCount);
  const currentIndex = clamp(Math.floor(rawChapter), 0, slideCount - 1);
  const nextIndex = Math.min(currentIndex + 1, slideCount - 1);
  const roomProgress = computeRoomProgress(rawChapter, currentIndex);

  return {
    cinemaProgress,
    rawChapter,
    currentIndex,
    nextIndex,
    roomProgress,
    storyProgress: computeStoryProgress(roomProgress),
    handoffProgress: computeHandoffProgress(roomProgress),
  };
}

export function computeReelLayerStyles(
  handoffProgress: number,
  reducedMotion: boolean
): { current: CinemaReelLayerStyle; next: CinemaReelLayerStyle } {
  if (reducedMotion) {
    const showNext = handoffProgress >= 0.5;
    return {
      current: { opacity: showNext ? 0 : 1, translateY: 0, scale: 1 },
      next: { opacity: showNext ? 1 : 0, translateY: 0, scale: 1 },
    };
  }

  const t = handoffProgress;
  return {
    current: {
      opacity: 1 - t,
      translateY: -8 * t,
      scale: 1 - 0.005 * t,
    },
    next: {
      opacity: t,
      translateY: 10 * (1 - t),
      scale: 0.997 + 0.003 * t,
    },
  };
}

export function layerStyleToCss(style: CinemaReelLayerStyle): string {
  return `translate3d(0, ${style.translateY}px, 0) scale(${style.scale})`;
}

export function computeRoomBeat(
  slideId: ProductSlideId,
  storyProgress: number
): number {
  return computeBeatIndex(storyProgress, beatCountForSlide(slideId));
}

export function shouldMountNextLayer(
  currentIndex: number,
  slideCount: number = PRODUCT_SLIDE_COUNT
): boolean {
  return currentIndex < slideCount - 1;
}
