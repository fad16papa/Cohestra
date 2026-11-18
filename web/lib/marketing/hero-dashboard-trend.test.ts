import { describe, expect, it } from "vitest";

import {
  HERO_DASHBOARD_TREND_DAYS,
  HERO_DASHBOARD_TREND_END,
  HERO_DASHBOARD_TREND_POINTS,
  heroWeeklyRegistrationsDeltaPercent,
  sumTrend,
} from "./hero-dashboard-trend";

function addUtcDays(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

describe("hero-dashboard-trend", () => {
  it("defines a 30-day consecutive UTC window ending DemoClub clock date", () => {
    expect(HERO_DASHBOARD_TREND_DAYS).toBe(30);
    expect(HERO_DASHBOARD_TREND_END).toBe("2026-09-07");
    expect(HERO_DASHBOARD_TREND_POINTS).toHaveLength(30);
    expect(HERO_DASHBOARD_TREND_POINTS[0].date).toBe("2026-08-09");
    expect(HERO_DASHBOARD_TREND_POINTS[29].date).toBe("2026-09-07");

    for (let i = 1; i < HERO_DASHBOARD_TREND_POINTS.length; i++) {
      const prev = HERO_DASHBOARD_TREND_POINTS[i - 1].date;
      expect(HERO_DASHBOARD_TREND_POINTS[i].date).toBe(addUtcDays(prev, 1));
    }
  });

  it("keeps the first 16 days at zero (no invented ambient activity)", () => {
    for (let i = 0; i < 16; i++) {
      expect(HERO_DASHBOARD_TREND_POINTS[i].registrations).toBe(0);
      expect(HERO_DASHBOARD_TREND_POINTS[i].newClients).toBe(0);
    }
  });

  it("matches prior-week seed totals Aug 25–31", () => {
    const slice = HERO_DASHBOARD_TREND_POINTS.slice(16, 23);
    expect(slice).toHaveLength(7);
    expect(sumTrend(slice, "registrations")).toBe(36);
    expect(sumTrend(slice, "newClients")).toBe(11);
    expect(slice.map((p) => p.registrations)).toEqual([6, 5, 5, 5, 5, 5, 5]);
    expect(slice.map((p) => p.newClients)).toEqual([2, 2, 2, 2, 1, 1, 1]);
  });

  it("matches current-week seed pairs Sep 1–7", () => {
    const slice = HERO_DASHBOARD_TREND_POINTS.slice(23);
    expect(slice).toHaveLength(7);
    const pairs = slice.map((p) => `${p.registrations}/${p.newClients}`);
    expect(pairs).toEqual(["5/2", "4/1", "6/2", "12/4", "7/3", "9/4", "5/2"]);
    expect(sumTrend(slice, "registrations")).toBe(48);
    expect(sumTrend(slice, "newClients")).toBe(18);
  });

  it("sums full period to 84 registrations and 29 new clients", () => {
    expect(sumTrend(HERO_DASHBOARD_TREND_POINTS, "registrations")).toBe(84);
    expect(sumTrend(HERO_DASHBOARD_TREND_POINTS, "newClients")).toBe(29);
  });

  it("keeps new clients on or below registrations each day", () => {
    for (const point of HERO_DASHBOARD_TREND_POINTS) {
      expect(point.newClients).toBeLessThanOrEqual(point.registrations);
    }
  });

  it("derives weekly KPI delta of +33%", () => {
    expect(heroWeeklyRegistrationsDeltaPercent(HERO_DASHBOARD_TREND_POINTS)).toBe(33);
  });
});