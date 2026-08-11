import { computeWowDeltaPercent } from "@/lib/dashboard-insights";
import type { ReportFilters, ReportResult } from "@/lib/reports-api";

export type ReportInsightTone = "positive" | "neutral" | "attention";

export type ReportInsight = {
  id: string;
  tone: ReportInsightTone;
  headline: string;
  detail: string;
};

function formatDeltaPhrase(current: number, previous: number, unit: string): string | null {
  const delta = computeWowDeltaPercent(current, previous);
  if (delta === null) {
    if (current > 0 && previous === 0) {
      return `first ${unit} in the comparison window`;
    }

    return null;
  }

  const rounded = Math.abs(delta) >= 10 ? Math.round(Math.abs(delta)) : Math.abs(delta).toFixed(1);
  if (delta > 0) {
    return `up ${rounded}% vs the prior period`;
  }

  if (delta < 0) {
    return `down ${rounded}% vs the prior period`;
  }

  return `flat vs the prior period`;
}

function formatCoverage(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function presetLabel(preset: string): string {
  switch (preset) {
    case "monthly":
      return "this month";
    case "custom":
      return "this period";
    default:
      return "this week";
  }
}

export function buildReportInsights(report: ReportResult): ReportInsight[] {
  const insights: ReportInsight[] = [];
  const periodLabel = presetLabel(report.period.preset);
  const registrationDelta = formatDeltaPhrase(
    report.registrations,
    report.priorPeriod.registrations,
    "registrations"
  );

  insights.push({
    id: "registrations",
    tone:
      report.registrations === 0
        ? "attention"
        : registrationDelta?.startsWith("up")
          ? "positive"
          : "neutral",
    headline:
      report.registrations === 1
        ? `1 registration ${periodLabel}`
        : `${report.registrations} registrations ${periodLabel}`,
    detail:
      report.registrations === 0
        ? "Widen the date range or clear filters to see activity."
        : registrationDelta ?? "No prior-period baseline to compare yet.",
  });

  const coverage = report.followUpStatus.coveragePercent;
  const priorCoverage = report.priorPeriod.followUpCoveragePercent;
  const coverageDelta = formatDeltaPhrase(coverage, priorCoverage, "coverage");

  insights.push({
    id: "follow-up",
    tone: coverage >= 75 ? "positive" : coverage >= 50 ? "neutral" : "attention",
    headline: `${formatCoverage(coverage)} follow-up coverage in this cohort`,
    detail:
      coverage >= 75
        ? `Strong outreach — ${report.followUpStatus.contactedCount + report.followUpStatus.activeCount} clients are contacted or active.${coverageDelta ? ` Coverage is ${coverageDelta}.` : ""}`
        : `${report.followUpStatus.newCount} clients still marked New. Coverage ${coverageDelta ?? "needs a prior baseline to trend"}.`,
  });

  if (report.repeatParticipants > 0) {
    insights.push({
      id: "retention",
      tone: "positive",
      headline: `${report.repeatParticipants} repeat participant${report.repeatParticipants === 1 ? "" : "s"}`,
      detail: "People came back for more than one activity in this filtered cohort.",
    });
  }

  if (report.activityRanking.length > 0) {
    const top = report.activityRanking[0];
    insights.push({
      id: "top-activity",
      tone: "neutral",
      headline: `${top.activityName} led with ${top.registrationCount} registrations`,
      detail: top.communityLabel
        ? `Top activity in ${top.communityLabel}.`
        : "Your busiest activity in this report.",
    });
  }

  return insights;
}

export function buildReportNarrativeSummary(report: ReportResult): string {
  const insights = buildReportInsights(report);
  return insights
    .slice(0, 2)
    .map((insight) => insight.headline)
    .join(" · ");
}

export function priorPeriodComparisonLabel(preset: string): string {
  switch (preset) {
    case "monthly":
      return "vs prior month window";
    case "custom":
      return "vs prior period";
    default:
      return "vs prior week window";
  }
}

export function reportFiltersToClientsHref(filters: ReportFilters): string {
  const params = new URLSearchParams();
  if (filters.leadStatus) {
    params.set("leadStatus", filters.leadStatus);
  }

  const query = params.toString();
  return query ? `/clients?${query}` : "/clients";
}

export function reportFiltersToActivitiesHref(): string {
  return "/activities";
}
