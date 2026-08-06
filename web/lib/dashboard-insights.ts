/**
 * Week-over-week percent change.
 * Returns null when there is no prior-period baseline (avoids a misleading +100%).
 */
export function computeWowDeltaPercent(
  current: number,
  previous: number
): number | null {
  if (previous === 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}
