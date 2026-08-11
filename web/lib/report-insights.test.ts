import { describe, expect, it } from "vitest";

import {
  buildReportInsights,
  buildReportNarrativeSummary,
  priorPeriodComparisonLabel,
  reportFiltersToClientsHref,
} from "@/lib/report-insights";
import type { ReportFilters, ReportResult } from "@/lib/reports-api";

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

  it("adds lead growth and community ranking insights", () => {
    const insights = buildReportInsights(baseReport());

    expect(insights.some((insight) => insight.id === "lead-growth")).toBe(true);
    expect(insights.some((insight) => insight.id === "top-community")).toBe(true);

    const leadGrowth = insights.find((insight) => insight.id === "lead-growth");
    expect(leadGrowth?.headline).toContain("12 new leads");
    expect(leadGrowth?.detail).toContain("up");
    expect(leadGrowth?.actionHref).toBe("/clients?leadStatus=new");

    const topCommunity = insights.find((insight) => insight.id === "top-community");
    expect(topCommunity?.headline).toContain("Sports club");
  });

  it("adds action links on follow-up and top activity insights", () => {
    const insights = buildReportInsights(baseReport());

    const followUp = insights.find((insight) => insight.id === "follow-up");
    expect(followUp?.actionHref).toBe("/clients?leadStatus=new");
    expect(followUp?.actionLabel).toBe("View new leads");

    const topActivity = insights.find((insight) => insight.id === "top-activity");
    expect(topActivity?.actionHref).toBe("/clients?activityId=a1");
    expect(topActivity?.actionLabel).toBe("View registrants");
  });

  it("maps extended report filters to clients href", () => {
    const filters: ReportFilters = {
      preset: "weekly",
      from: "",
      to: "",
      activityId: "a1",
      community: "",
      leadStatus: "new",
      referralSource: "",
      followUpDue: true,
      mergeSuspect: false,
      nationality: "Philippines",
      search: "maria",
    };

    const href = reportFiltersToClientsHref(filters);
    expect(href).toContain("leadStatus=new");
    expect(href).toContain("followUpDue=true");
    expect(href).toContain("nationality=Philippines");
    expect(href).toContain("search=maria");
    expect(href).toContain("activityId=a1");
  });
});
