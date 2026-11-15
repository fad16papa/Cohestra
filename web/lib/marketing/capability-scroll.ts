export type ChapterSentinel = {
  id: string;
  top: number;
  bottom: number;
};

export function chooseChapterId(
  sentinels: ChapterSentinel[],
  viewportHeight: number,
  readingLine?: number
): string | null {
  if (sentinels.length === 0) {
    return null;
  }

  const line = readingLine ?? viewportHeight * 0.22;

  const containing = sentinels.filter((s) => s.top <= line && s.bottom >= line);
  if (containing.length > 0) {
    let best = containing[0];
    for (const s of containing) {
      if (s.top > best.top) {
        best = s;
      }
    }
    return best.id;
  }

  const allBelowLine = sentinels.every((s) => s.top > line);
  if (allBelowLine) {
    return sentinels[0].id;
  }

  const allAboveLine = sentinels.every((s) => s.bottom < line);
  if (allAboveLine) {
    return sentinels[sentinels.length - 1].id;
  }

  const aboveLine = sentinels.filter((s) => s.bottom < line);
  if (aboveLine.length > 0) {
    let best = aboveLine[0];
    for (const s of aboveLine) {
      if (s.top > best.top) {
        best = s;
      }
    }
    return best.id;
  }

  return sentinels[0].id;
}

export function activeWhileLocked(
  lockedId: string | null,
  measuredId: string | null
): string | null {
  if (lockedId !== null) {
    return lockedId;
  }
  return measuredId;
}

export type DesktopFrame = {
  height: number;
  scale: number;
  storyTop: number;
  readingLine: number;
};

/**
 * Largest preview that can stay fully on screen for both the first story
 * and the last. Short viewports scale the existing frame down; they do not
 * add empty scroll distance.
 */
export function computeDesktopFrame(
  naturalHeight: number,
  lastStoryHeight: number,
  viewportHeight: number
): DesktopFrame {
  const sticky = 96;
  const margin = 20;
  const fitted = Math.floor((viewportHeight - margin - sticky - 8 + lastStoryHeight) / 2);
  const height = Math.min(naturalHeight, Math.max(280, fitted));
  const scale = naturalHeight > 0 ? height / naturalHeight : 1;
  const aMax = viewportHeight - margin - height;
  const aMin = sticky + height + 8 - lastStoryHeight;
  const storyTop = Math.round(Math.min(aMax, Math.max(sticky, aMin)));
  return {
    height,
    scale,
    storyTop,
    readingLine: storyTop + 16,
  };
}

export function stepChapter(index: number, delta: number, count: number): number {
  if (count <= 0) {
    return 0;
  }
  const next = index + delta;
  if (next < 0) {
    return 0;
  }
  if (next >= count) {
    return count - 1;
  }
  return next;
}