export type ChapterSentinel = {
  id: string;
  top: number;
  bottom: number;
};

export function chooseChapterId(
  sentinels: ChapterSentinel[],
  viewportHeight: number
): string | null {
  if (sentinels.length === 0) {
    return null;
  }

  const line = viewportHeight * 0.22;

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