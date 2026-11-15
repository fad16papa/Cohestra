import type { DashboardTrendPoint } from "@/lib/dashboard-api";

export const HERO_DASHBOARD_TREND_DAYS = 30;

/** DemoClub clock date from seed (Asia/Singapore calendar window, stored as UTC yyyy-MM-dd). */
export const HERO_DASHBOARD_TREND_END = "2026-09-07";

const PRIOR_WEEK_REGISTRATIONS = [6, 5, 5, 5, 5, 5, 5] as const;
const PRIOR_WEEK_NEW_CLIENTS = [2, 2, 2, 2, 1, 1, 1] as const;

const CURRENT_WEEK: ReadonlyArray<{ registrations: number; newClients: number }> = [
  { registrations: 5, newClients: 2 },
  { registrations: 4, newClients: 1 },
  { registrations: 6, newClients: 2 },
  { registrations: 12, newClients: 4 },
  { registrations: 7, newClients: 3 },
  { registrations: 9, newClients: 4 },
  { registrations: 5, newClients: 2 },
];

function addUtcDays(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

function buildHeroTrendPoints(): DashboardTrendPoint[] {
  const start = addUtcDays(HERO_DASHBOARD_TREND_END, -(HERO_DASHBOARD_TREND_DAYS - 1));
  const points: DashboardTrendPoint[] = [];

  for (let i = 0; i < HERO_DASHBOARD_TREND_DAYS; i++) {
    const date = addUtcDays(start, i);
    const dayFromEnd = HERO_DASHBOARD_TREND_DAYS - 1 - i;

    if (dayFromEnd >= 14) {
      points.push({ date, registrations: 0, newClients: 0 });
    } else if (dayFromEnd >= 7) {
      const idx = 13 - dayFromEnd;
      points.push({
        date,
        registrations: PRIOR_WEEK_REGISTRATIONS[idx],
        newClients: PRIOR_WEEK_NEW_CLIENTS[idx],
      });
    } else {
      const week = CURRENT_WEEK[6 - dayFromEnd];
      points.push({
        date,
        registrations: week.registrations,
        newClients: week.newClients,
      });
    }
  }

  return points;
}

export const HERO_DASHBOARD_TREND_POINTS = buildHeroTrendPoints();

export function sumTrend(
  points: DashboardTrendPoint[],
  key: "registrations" | "newClients"
): number {
  return points.reduce((acc, point) => acc + point[key], 0);
}

export function heroWeeklyRegistrationsDeltaPercent(points: DashboardTrendPoint[]): number {
  const last7 = sumTrend(points.slice(-7), "registrations");
  const prev7 = sumTrend(points.slice(-14, -7), "registrations");
  if (prev7 === 0) {
    return 0;
  }
  return Math.round(((last7 - prev7) / prev7) * 100);
}

export function heroRegistrationsThisWeek(points: DashboardTrendPoint[]): number {
  return sumTrend(points.slice(-7), "registrations");
}