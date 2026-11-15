import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  activeWhileLocked,
  chooseChapterId,
  computeDesktopFrame,
  stepChapter,
  type ChapterSentinel,
} from "./capability-scroll";

const CHAPTER_IDS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
] as const;

function vhSentinels(viewportHeight: number, vhFraction: number): ChapterSentinel[] {
  const height = viewportHeight * vhFraction;
  return CHAPTER_IDS.map((id, index) => ({
    id,
    top: index * height,
    bottom: (index + 1) * height,
  }));
}

describe("chooseChapterId", () => {
  const viewportHeight = 1000;
  const line = viewportHeight * 0.22;

  it("slow downward: line through six non-overlapping 28vh sentinels advances 01..06 with no backward step", () => {
    const sentinels = vhSentinels(viewportHeight, 0.28);
    const steps: string[] = [];
    const maxTop = sentinels[sentinels.length - 1].bottom;
    for (let y = 0; y <= maxTop + line; y += 8) {
      const shifted = sentinels.map((s) => ({
        ...s,
        top: s.top - y,
        bottom: s.bottom - y,
      }));
      const id = chooseChapterId(shifted, viewportHeight);
      if (id) {
        steps.push(id);
      }
    }
    const compact = steps.filter((id, i) => i === 0 || id !== steps[i - 1]);
    expect(compact).toEqual([...CHAPTER_IDS]);
    for (let i = 1; i < compact.length; i++) {
      const prev = Number(compact[i - 1]);
      const curr = Number(compact[i]);
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it("fast downward: line jumping from chapter 1 to chapter 4 returns chapter 4", () => {
    const sentinels = vhSentinels(viewportHeight, 0.28);
    const yJump = sentinels[3].top - line + 50;
    const shifted = sentinels.map((s) => ({
      ...s,
      top: s.top - yJump,
      bottom: s.bottom - yJump,
    }));
    expect(chooseChapterId(shifted, viewportHeight)).toBe("04");
  });

  it("reverse: stepping the line upward goes back one chapter at a time", () => {
    const sentinels = vhSentinels(viewportHeight, 0.28);
    const maxTop = sentinels[sentinels.length - 1].bottom;
    const steps: string[] = [];
    for (let y = maxTop + line; y >= 0; y -= 8) {
      const shifted = sentinels.map((s) => ({
        ...s,
        top: s.top - y,
        bottom: s.bottom - y,
      }));
      const id = chooseChapterId(shifted, viewportHeight);
      if (id) {
        steps.push(id);
      }
    }
    const compact = steps.filter((id, i) => i === 0 || id !== steps[i - 1]);
    expect(compact[0]).toBe("06");
    expect(compact[compact.length - 1]).toBe("01");
    for (let i = 1; i < compact.length; i++) {
      const prev = Number(compact[i - 1]);
      const curr = Number(compact[i]);
      expect(curr).toBeLessThanOrEqual(prev);
    }
  });

  it("last chapter to pricing: line below last sentinel keeps last chapter", () => {
    const sentinels = vhSentinels(viewportHeight, 0.28);
    const yPast = sentinels[5].bottom + 200;
    const shifted = sentinels.map((s) => ({
      ...s,
      top: s.top - yPast,
      bottom: s.bottom - yPast,
    }));
    expect(chooseChapterId(shifted, viewportHeight)).toBe("06");
  });

  it("desktop-height stories at the in-frame reading line advance in order", () => {
    const height = 279;
    const line = 424;
    const origin = line + 40;
    const stories = CHAPTER_IDS.map((id, index) => ({
      id,
      top: origin + index * height,
      bottom: origin + (index + 1) * height,
    }));
    const steps: string[] = [];
    for (let y = 0; y <= stories[stories.length - 1].bottom; y += 8) {
      const shifted = stories.map((story) => ({
        ...story,
        top: story.top - y,
        bottom: story.bottom - y,
      }));
      const id = chooseChapterId(shifted, 900, line);
      if (id) {
        steps.push(id);
      }
    }
    const compact = steps.filter((id, index) => index === 0 || id !== steps[index - 1]);
    expect(compact).toEqual([...CHAPTER_IDS]);
  });

  it("short visible stories at a fixed reading line advance in order", () => {
    const height = 220;
    const line = 136;
    const stories = CHAPTER_IDS.map((id, index) => ({
      id,
      top: index * height,
      bottom: (index + 1) * height,
    }));
    const steps: string[] = [];
    for (let y = 0; y <= stories[stories.length - 1].bottom; y += 8) {
      const shifted = stories.map((story) => ({
        ...story,
        top: story.top - y,
        bottom: story.bottom - y,
      }));
      const id = chooseChapterId(shifted, 900, line);
      if (id) {
        steps.push(id);
      }
    }
    const compact = steps.filter((id, index) => index === 0 || id !== steps[index - 1]);
    expect(compact).toEqual([...CHAPTER_IDS]);
  });

  it("reduced motion: identical rects yield the same id when called twice", () => {
    const sentinels = vhSentinels(viewportHeight, 0.28);
    const shifted = sentinels.map((s) => ({
      ...s,
      top: s.top - 400,
      bottom: s.bottom - 400,
    }));
    const a = chooseChapterId(shifted, viewportHeight);
    const b = chooseChapterId(shifted, viewportHeight);
    expect(a).toBe(b);
    expect(a).not.toBeNull();
  });

  it("reduced motion: chapter scroll uses auto behavior when the user prefers less motion", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../../components/marketing/marketing-capability-chapters.tsx"),
      "utf8"
    );
    expect(source).toContain("prefers-reduced-motion: reduce");
    expect(source).toContain('behavior: prefersReducedMotion() ? "auto" : "smooth"');
  });
});

describe("computeDesktopFrame", () => {
  it("keeps the full frame on tall viewports and fits it on short ones", () => {
    const tall = computeDesktopFrame(576, 279, 1080);
    expect(tall.scale).toBe(1);
    expect(tall.storyTop + tall.height).toBeLessThanOrEqual(1080 - 20);
    expect(tall.storyTop + 279).toBeGreaterThanOrEqual(96 + tall.height);

    const short = computeDesktopFrame(576, 279, 800);
    expect(short.height).toBeLessThan(576);
    expect(short.storyTop + short.height).toBeLessThanOrEqual(800 - 20);
    expect(short.storyTop + 279).toBeGreaterThanOrEqual(96 + short.height);
  });
});

describe("activeWhileLocked", () => {
  it("click during scroll: returns locked id when set", () => {
    expect(activeWhileLocked("03", "02")).toBe("03");
    expect(activeWhileLocked(null, "04")).toBe("04");
    expect(activeWhileLocked(null, null)).toBeNull();
  });
});

describe("stepChapter", () => {
  const count = 6;

  it("clamps and moves by one for previous/next", () => {
    expect(stepChapter(2, -1, count)).toBe(1);
    expect(stepChapter(2, 1, count)).toBe(3);
    expect(stepChapter(0, -1, count)).toBe(0);
    expect(stepChapter(count - 1, 1, count)).toBe(count - 1);
  });
});