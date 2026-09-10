import { describe, expect, it } from "vitest";

import {
  CINEMA_HANDOFF_START,
  computeCinemaReelState,
  computeHandoffProgress,
  computeReelLayerStyles,
  computeStoryProgress,
  shouldMountNextLayer,
} from "@/lib/marketing/cinema-reel";
import { PRODUCT_SLIDE_COUNT } from "@/lib/marketing/product-slides";
import { seekProgressForIndex } from "@/lib/marketing/cinema-roll";

describe("cinema-reel", () => {
  it("maps story progress before handoff zone", () => {
    expect(computeStoryProgress(0)).toBe(0);
    expect(computeStoryProgress(CINEMA_HANDOFF_START * 0.5)).toBeCloseTo(0.5, 5);
    expect(computeStoryProgress(CINEMA_HANDOFF_START)).toBe(1);
  });

  it("ramps handoff progress in the tail of a chapter", () => {
    expect(computeHandoffProgress(CINEMA_HANDOFF_START)).toBe(0);
    expect(computeHandoffProgress(1)).toBe(1);
    expect(computeHandoffProgress(0.84)).toBeCloseTo(0.5, 1);
  });

  it("computes continuous reel state from global progress", () => {
    const mid = computeCinemaReelState(0.5, PRODUCT_SLIDE_COUNT);
    expect(mid.currentIndex).toBe(3);
    expect(mid.nextIndex).toBe(4);
    expect(mid.roomProgress).toBeCloseTo(0, 5);
  });

  it("overlaps current and next layers during handoff", () => {
    const styles = computeReelLayerStyles(0.5, false);
    expect(styles.current.opacity).toBeCloseTo(0.5, 5);
    expect(styles.next.opacity).toBeCloseTo(0.5, 5);
    expect(styles.current.translateY).toBeLessThan(0);
    expect(styles.next.translateY).toBeGreaterThan(0);
  });

  it("snaps layers under reduced motion", () => {
    const before = computeReelLayerStyles(0.2, true);
    const after = computeReelLayerStyles(0.8, true);
    expect(before.current.opacity).toBe(1);
    expect(after.next.opacity).toBe(1);
  });

  it("pill seek lands near room entry with low handoff", () => {
    const progress = seekProgressForIndex(2, PRODUCT_SLIDE_COUNT);
    const reel = computeCinemaReelState(progress, PRODUCT_SLIDE_COUNT);
    expect(reel.currentIndex).toBe(2);
    expect(reel.roomProgress).toBeLessThan(0.2);
    expect(reel.handoffProgress).toBe(0);
  });

  it("mounts next layer for all but last room", () => {
    expect(shouldMountNextLayer(0)).toBe(true);
    expect(shouldMountNextLayer(PRODUCT_SLIDE_COUNT - 1)).toBe(false);
  });

  it("reverse direction preserves derivable state at any progress", () => {
    const forward = computeCinemaReelState(0.42, PRODUCT_SLIDE_COUNT);
    const backward = computeCinemaReelState(0.42, PRODUCT_SLIDE_COUNT);
    expect(forward).toEqual(backward);
  });
});
