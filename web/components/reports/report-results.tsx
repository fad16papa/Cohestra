import { MetricTile } from "@/components/dashboard/metric-tile";
import { ReportActivityRankingChart } from "@/components/reports/report-activity-ranking-chart";
import { ReportFollowUpChart } from "@/components/reports/report-follow-up-chart";
import { ReportNarrativeHero } from "@/components/reports/report-narrative-hero";
import { ReportRegistrationsTrendChart } from "@/components/reports/report-registrations-trend-chart";
import { ReportTrustBar } from "@/components/reports/report-trust-bar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { computeWowDeltaPercent } from "@/lib/dashboard-insights";
import {
  priorPeriodComparisonLabel,
  reportFiltersToActivitiesHref,
  reportFiltersToClientsHref,
} from "@/lib/report-insights";
import type { ReportFilters, ReportResult } from "@/lib/reports-api";

type ReportResultsProps = {
  report: ReportResult;
  filters: ReportFilters;
};

function formatCoveragePercent(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function formatDateRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startAt} – ${endAt}`;
  }

  const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function periodLabel(preset: string): string {
  switch (preset) {
    case "monthly":
      return "this month";
    case "custom":
      return "this period";
    default:
      return "this week";
  }
}

export function ReportResults({ report, filters }: ReportResultsProps) {
  const comparisonLabel = priorPeriodComparisonLabel(report.period.preset);

  if (report.registrations === 0) {
    return (
      <div className="space-y-6">
        <ReportTrustBar report={report} filters={filters} />
        <div className="rounded-xl border border-dashed border-border-warm px-6 py-10 text-center">
          <p className="text-sm text-text-warm">No registrations in this period.</p>
          <p className="mt-2 text-sm text-text-muted-warm">
            Adjust your date range or filters to widen the report.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReportTrustBar report={report} filters={filters} />
      <ReportNarrativeHero report={report} />

      <p className="text-sm text-text-muted-warm">
        Period: {formatDateRange(report.period.startAt, report.period.endAt)}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Registrations"
          value={String(report.registrations)}
          href={reportFiltersToClientsHref(filters)}
          ariaLabel={`${report.registrations} registrations in report period`}
          delta={{
            percent: computeWowDeltaPercent(
              report.registrations,
              report.priorPeriod.registrations
            ),
            label: comparisonLabel,
          }}
        />
        <MetricTile
          label="New leads"
          value={String(report.newLeads)}
          href={reportFiltersToClientsHref(filters)}
          ariaLabel={`${report.newLeads} new leads in report period`}
          delta={{
            percent: computeWowDeltaPercent(report.newLeads, report.priorPeriod.newLeads),
            label: comparisonLabel,
          }}
        />
        <MetricTile
          label="Activities hosted"
          value={String(report.activitiesHosted)}
          href={reportFiltersToActivitiesHref()}
          ariaLabel={`${report.activitiesHosted} activities hosted in report period`}
          delta={{
            percent: computeWowDeltaPercent(
              report.activitiesHosted,
              report.priorPeriod.activitiesHosted
            ),
            label: comparisonLabel,
          }}
        />
        <MetricTile
          label="Follow-up coverage"
          value={formatCoveragePercent(report.followUpStatus.coveragePercent)}
          href={reportFiltersToClientsHref({ ...filters, leadStatus: "new" })}
          ariaLabel={`Follow-up coverage ${formatCoveragePercent(report.followUpStatus.coveragePercent)}`}
          delta={{
            percent: computeWowDeltaPercent(
              report.followUpStatus.coveragePercent,
              report.priorPeriod.followUpCoveragePercent
            ),
            label: comparisonLabel,
          }}
        />
      </div>

      <ReportRegistrationsTrendChart
        points={report.dailyTrend}
        periodLabel={periodLabel(report.period.preset)}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportFollowUpChart followUpStatus={report.followUpStatus} />
        <ReportActivityRankingChart items={report.activityRanking} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border-warm">
          <CardHeader>
            <CardTitle className="text-section text-text-warm">Lead growth</CardTitle>
            <CardDescription className="text-text-muted-warm">
              Cohort scoped to filtered registrations.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-text-muted-warm">
            <p>New leads in period: {report.leadGrowth.newLeadsInPeriod}</p>
            <p>Clients in cohort: {report.leadGrowth.totalLeadsAtEnd}</p>
            <p>Existing before period: {report.leadGrowth.totalLeadsBeforePeriod}</p>
            <p>Repeat participants: {report.repeatParticipants}</p>
            <p>Inactive clients in cohort: {report.inactiveClients}</p>
          </CardContent>
        </Card>

        <Card className="border-border-warm">
          <CardHeader>
            <CardTitle className="text-section text-text-warm">Community ranking</CardTitle>
            <CardDescription className="text-text-muted-warm">
              Registration volume grouped by community label.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {report.communityRanking.length === 0 ? (
              <p className="text-sm text-text-muted-warm">
                Community rankings appear when activities include community labels.
              </p>
            ) : (
              <ul className="space-y-3">
                {report.communityRanking.map((item, index) => (
                  <li
                    key={`${item.communityLabel}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-border-warm px-4 py-3 text-sm"
                  >
                    <span className="text-text-warm">
                      #{index + 1} {item.communityLabel}
                    </span>
                    <span className="text-text-muted-warm">{item.registrationCount}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {report.campaignResults.available ? (
        <Card>
          <CardHeader>
            <CardTitle>Campaign results</CardTitle>
            <CardDescription className="text-text-muted-warm">
              Outreach volume for this period on Pro and Enterprise.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-text-muted-warm">
              <span className="font-medium text-text-warm">
                {report.campaignResults.campaignsSent}
              </span>{" "}
              campaigns sent in this period
            </p>
            <p className="text-text-muted-warm">
              <span className="font-medium text-text-warm">
                {report.campaignResults.campaignsFailed}
              </span>{" "}
              campaigns with delivery failures
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
