import type { ProductSlideId } from "@/lib/marketing/product-slides";

/** Pill seek lands near room entry, not chapter midpoint. */
export const CINEMA_SEEK_ENTRY_FRACTION = 0.12;

/** Semantic beats per cinema room (Website stays stable at 1). */
export const CINEMA_ROLL_BEAT_COUNTS: Record<ProductSlideId, number> = {
  website: 1,
  clients: 3,
  activities: 3,
  outreach: 3,
  analytics: 2,
  intelligence: 3,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeRawChapter(progress: number, slideCount: number): number {
  return progress * slideCount;
}

/** Local progress 0→1 within the active room chapter. */
export function computeChapterProgress(
  progress: number,
  slideCount: number,
  activeIndex: number
): number {
  const raw = computeRawChapter(progress, slideCount);
  return clamp(raw - activeIndex, 0, 1);
}

/** Map chapter progress to a discrete semantic beat index. */
export function computeBeatIndex(chapterProgress: number, beatCount: number): number {
  if (beatCount <= 1) {
    return 0;
  }
  return Math.min(beatCount - 1, Math.floor(chapterProgress * beatCount));
}

/** Global scroll progress for pill seek / keyboard navigation. */
export function seekProgressForIndex(
  index: number,
  slideCount: number,
  entryFraction = CINEMA_SEEK_ENTRY_FRACTION
): number {
  const target = clamp(index, 0, slideCount - 1);
  return (target + entryFraction) / slideCount;
}

export function beatCountForSlide(slideId: ProductSlideId): number {
  return CINEMA_ROLL_BEAT_COUNTS[slideId] ?? 1;
}

/** Hysteresis is applied in raw chapter units (progress × slideCount). */
export function indexFromProgress(
  progress: number,
  slideCount: number,
  current: number,
  hysteresis: number
): number {
  const raw = computeRawChapter(progress, slideCount);
  const lower = current - hysteresis;
  const upper = current + 1 + hysteresis;
  if (raw >= lower && raw < upper) {
    return current;
  }
  return clamp(Math.floor(raw), 0, slideCount - 1);
}
