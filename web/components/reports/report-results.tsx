import Link from "next/link";
import type { ReactNode } from "react";

import { MetricTile } from "@/components/dashboard/metric-tile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ReportResult } from "@/lib/reports-api";

type ReportResultsProps = {
  report: ReportResult;
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

const RANKING_VISIBLE_COUNT = 5;

/** ~one ranked row (py-3 + border) × 5 + gaps between rows */
const rankingListScrollClassName =
  "max-h-[17.5rem] overflow-y-auto overscroll-y-contain pr-1 [-ms-overflow-style:auto] [scrollbar-gutter:stable]";

type ReportRankingScrollListProps = {
  itemCount: number;
  children: ReactNode;
};

function ReportRankingScrollList({
  itemCount,
  children,
}: ReportRankingScrollListProps) {
  return (
    <div className="space-y-2">
      {itemCount > RANKING_VISIBLE_COUNT ? (
        <p className="text-xs text-text-muted-warm">
          Showing top {RANKING_VISIBLE_COUNT} — scroll for{" "}
          {itemCount - RANKING_VISIBLE_COUNT} more
        </p>
      ) : null}
      <div className={rankingListScrollClassName}>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

export function ReportResults({ report }: ReportResultsProps) {
  if (report.registrations === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-warm px-6 py-10 text-center">
        <p className="text-sm text-text-warm">No registrations in this period.</p>
        <p className="mt-2 text-sm text-text-muted-warm">
          Adjust your date range or filters to widen the report.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-muted-warm">
        Period: {formatDateRange(report.period.startAt, report.period.endAt)}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Registrations"
          value={String(report.registrations)}
          href="/clients"
          ariaLabel={`${report.registrations} registrations in report period`}
        />
        <MetricTile
          label="New leads"
          value={String(report.newLeads)}
          href="/clients"
          ariaLabel={`${report.newLeads} new leads in report period`}
        />
        <MetricTile
          label="Activities hosted"
          value={String(report.activitiesHosted)}
          href="/activities"
          ariaLabel={`${report.activitiesHosted} activities hosted in report period`}
        />
        <MetricTile
          label="Follow-up coverage"
          value={formatCoveragePercent(report.followUpStatus.coveragePercent)}
          href="/clients?leadStatus=new"
          ariaLabel={`Follow-up coverage ${formatCoveragePercent(report.followUpStatus.coveragePercent)}`}
        />
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
            <CardTitle className="text-section text-text-warm">Follow-up status</CardTitle>
            <CardDescription className="text-text-muted-warm">
              Current status for clients in this report cohort.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-text-muted-warm">
            <p>New: {report.followUpStatus.newCount}</p>
            <p>Contacted: {report.followUpStatus.contactedCount}</p>
            <p>Active: {report.followUpStatus.activeCount}</p>
            <p>Inactive: {report.followUpStatus.inactiveCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border-warm">
          <CardHeader>
            <CardTitle className="text-section text-text-warm">
              Activity ranking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportRankingScrollList itemCount={report.activityRanking.length}>
              {report.activityRanking.map((item, index) => (
                <Link
                  key={item.activityId}
                  href={`/activities/${item.activityId}`}
                  className="flex items-center justify-between rounded-lg border border-border-warm px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                >
                  <span className="text-text-warm">
                    #{index + 1} {item.activityName}
                  </span>
                  <span className="text-text-muted-warm">
                    {item.registrationCount}
                  </span>
                </Link>
              ))}
            </ReportRankingScrollList>
          </CardContent>
        </Card>

        <Card className="border-border-warm">
          <CardHeader>
            <CardTitle className="text-section text-text-warm">
              Community ranking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportRankingScrollList itemCount={report.communityRanking.length}>
              {report.communityRanking.map((item, index) => (
                <div
                  key={`${item.communityLabel}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-border-warm px-4 py-3 text-sm"
                >
                  <span className="text-text-warm">
                    #{index + 1} {item.communityLabel}
                  </span>
                  <span className="text-text-muted-warm">
                    {item.registrationCount}
                  </span>
                </div>
              ))}
            </ReportRankingScrollList>
          </CardContent>
        </Card>
      </div>

      {report.campaignResults.available ? (
        <Card>
          <CardHeader>
            <CardTitle>Campaign results</CardTitle>
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
