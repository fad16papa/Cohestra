import { describe, expect, it } from "vitest";

import { CINEMA_HYSTERESIS, PRODUCT_SLIDE_COUNT } from "@/lib/marketing/product-slides";
import {
  CINEMA_ROLL_BEAT_COUNTS,
  CINEMA_SEEK_ENTRY_FRACTION,
  computeBeatIndex,
  computeChapterProgress,
  indexFromProgress,
  seekProgressForIndex,
} from "@/lib/marketing/cinema-roll";

describe("cinema-roll", () => {
  it("maps global progress to local chapter progress", () => {
    expect(computeChapterProgress(0.2, 6, 1)).toBeCloseTo(0.2, 5);
    expect(computeChapterProgress(0.05, 6, 0)).toBeCloseTo(0.3, 5);
  });

  it("derives semantic beats from chapter progress", () => {
    expect(computeBeatIndex(0, 3)).toBe(0);
    expect(computeBeatIndex(0.34, 3)).toBe(1);
    expect(computeBeatIndex(0.9, 3)).toBe(2);
    expect(computeBeatIndex(1, 1)).toBe(0);
  });

  it("seeks to room entry not midpoint", () => {
    const entry = seekProgressForIndex(2, PRODUCT_SLIDE_COUNT);
    const midpoint = (2 + 0.5) / PRODUCT_SLIDE_COUNT;
    expect(entry).toBeCloseTo((2 + CINEMA_SEEK_ENTRY_FRACTION) / PRODUCT_SLIDE_COUNT, 5);
    expect(entry).toBeLessThan(midpoint);
    expect(computeChapterProgress(entry, PRODUCT_SLIDE_COUNT, 2)).toBeLessThan(0.2);
  });

  it("applies hysteresis at chapter boundaries", () => {
    const n = PRODUCT_SLIDE_COUNT;
    expect(indexFromProgress(0.16, n, 0, CINEMA_HYSTERESIS)).toBe(0);
    expect(indexFromProgress(0.18, n, 0, CINEMA_HYSTERESIS)).toBe(1);
  });

  it("fast scroll lands on valid beat without intermediate requirement", () => {
    const progress = seekProgressForIndex(3, PRODUCT_SLIDE_COUNT);
    const beat = computeBeatIndex(
      computeChapterProgress(progress, PRODUCT_SLIDE_COUNT, 3),
      3
    );
    expect(beat).toBe(0);
  });

  it("keeps website room at single beat", () => {
    expect(CINEMA_ROLL_BEAT_COUNTS.website).toBe(1);
    expect(computeBeatIndex(0.99, 1)).toBe(0);
  });

  it("assigns 3 beats to primary narrative rooms", () => {
    expect(CINEMA_ROLL_BEAT_COUNTS.clients).toBe(3);
    expect(CINEMA_ROLL_BEAT_COUNTS.activities).toBe(3);
    expect(CINEMA_ROLL_BEAT_COUNTS.outreach).toBe(3);
    expect(CINEMA_ROLL_BEAT_COUNTS.intelligence).toBe(3);
  });

  it("assigns 2 beats to analytics continuity", () => {
    expect(CINEMA_ROLL_BEAT_COUNTS.analytics).toBe(2);
  });
});
