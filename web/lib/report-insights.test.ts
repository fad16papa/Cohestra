import { describe, expect, it } from "vitest";

import {
  buildReportInsights,
  buildReportNarrativeSummary,
  priorPeriodComparisonLabel,
} from "@/lib/report-insights";
import type { ReportResult } from "@/lib/reports-api";

function baseReport(overrides: Partial<ReportResult> = {}): ReportResult {
  return {
    period: {
      preset: "weekly",
      startAt: "2026-08-04T00:00:00.000Z",
      endAt: "2026-08-10T16:00:00.000Z",
      computedAt: "2026-08-10T16:00:00.000Z",
    },
    activitiesHosted: 3,
    registrations: 36,
    newLeads: 12,
    followUpStatus: {
      newCount: 8,
      contactedCount: 10,
      activeCount: 14,
      inactiveCount: 4,
      coveragePercent: 78,
    },
    activityRanking: [
      {
        activityId: "a1",
        activityName: "Sunday clinic",
        communityLabel: "Sports club",
        registrationCount: 18,
      },
    ],
    leadGrowth: {
      newLeadsInPeriod: 12,
      totalLeadsAtEnd: 36,
      totalLeadsBeforePeriod: 24,
    },
    communityRanking: [{ communityLabel: "Sports club", registrationCount: 18 }],
    repeatParticipants: 5,
    inactiveClients: 4,
    campaignResults: { available: false, campaignsSent: 0, campaignsFailed: 0 },
    priorPeriod: {
      startAt: "2026-07-28T00:00:00.000Z",
      endAt: "2026-08-03T23:59:59.000Z",
      registrations: 32,
      newLeads: 10,
      activitiesHosted: 2,
      followUpCoveragePercent: 72,
    },
    dailyTrend: [],
    ...overrides,
  };
}

describe("report-insights", () => {
  it("builds a narrative summary from the top insights", () => {
    const summary = buildReportNarrativeSummary(baseReport());
    expect(summary).toContain("36 registrations this week");
    expect(summary).toContain("78% follow-up coverage");
  });

  it("flags empty periods as attention insights", () => {
    const insights = buildReportInsights(baseReport({ registrations: 0 }));
    expect(insights[0]?.tone).toBe("attention");
    expect(insights[0]?.detail).toContain("Widen the date range");
  });

  it("labels prior period comparisons by preset", () => {
    expect(priorPeriodComparisonLabel("weekly")).toBe("vs prior week window");
    expect(priorPeriodComparisonLabel("monthly")).toBe("vs prior month window");
    expect(priorPeriodComparisonLabel("custom")).toBe("vs prior period");
  });
});
