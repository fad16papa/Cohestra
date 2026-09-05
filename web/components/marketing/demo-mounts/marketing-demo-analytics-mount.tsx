"use client";

import { DashboardRegistrationsTrendChart } from "@/components/dashboard/dashboard-registrations-trend-chart";
import { MarketingDemoTheme } from "@/components/marketing/marketing-demo-theme";
import { useMarketingDemoClub } from "@/components/marketing/marketing-demo-provider";
import {
  ReportPanelHeader,
  ReportRankBadge,
  ReportShareBar,
} from "@/components/reports/report-visual-primitives";
import {
  ANCHOR_IDS,
  countNeedAttention,
  getGoldenHourSpots,
  getReportsProofClients,
} from "@/lib/marketing/marketing-demo-club";

export function MarketingDemoAnalyticsMount() {
  const club = useMarketingDemoClub();
  const report = club.reports;
  const metrics = club.dashboard;
  const attention = countNeedAttention(club);
  const spots = getGoldenHourSpots(club);
  const proof = getReportsProofClients(club);
  const maya = club.clientDetails[ANCHOR_IDS.maya];
  const safeRows = report.activityRanking.map((row) => ({
    ...row,
    registrationCount:
      Number.isFinite(row.registrationCount) && row.registrationCount > 0
        ? row.registrationCount
        : 0,
  }));
  const total = safeRows.reduce((sum, row) => sum + row.registrationCount, 0);
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 1;

  const acquisitionLines = Object.values(club.clientDetails)
    .map((detail) => detail.referralSource)
    .filter((value): value is string => Boolean(value && value.trim()));
  const acquisitionCounts = new Map<string, number>();
  for (const source of acquisitionLines) {
    acquisitionCounts.set(source, (acquisitionCounts.get(source) ?? 0) + 1);
  }
  const topSources = [...acquisitionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <MarketingDemoTheme>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto bg-paper-warm p-3">
        <div className="rounded-md border border-line bg-paper px-4 py-3">
          <p className="text-xs text-stone-cinema">
            {club.orgName} · week of {club.reportFilters.from} → {club.reportFilters.to} ·{" "}
            {club.clock.timeZoneId}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">
            Operator questions for {club.operatorGreeting}
          </p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-2">
          <section className="rounded-md border border-line bg-paper">
            <ReportPanelHeader
              title="Where are repeat attendees coming from?"
              description={
                maya
                  ? `${maya.fullName} arrived via ${maya.referralSource ?? "unknown"} — still on Golden Hour`
                  : "Acquisition from client records"
              }
            />
            <ul className="space-y-2 px-4 py-3">
              {topSources.map(([source, count]) => (
                <li key={source} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-ink">{source}</span>
                  <span className="tabular-nums text-stone-cinema">{count}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-md border border-line bg-paper">
            <ReportPanelHeader
              title="Which activities are growing?"
              description={`Golden Hour ${spots.going}/${spots.capacity} · ${spots.spotsLeft} spots left`}
            />
            <ul className="space-y-3 px-4 py-3">
              {safeRows.map((row, index) => (
                <li key={row.activityId} className="flex items-center gap-3">
                  <ReportRankBadge rank={index + 1} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{row.activityName}</p>
                    <div className="mt-1">
                      <ReportShareBar percent={(row.registrationCount / safeTotal) * 100} />
                    </div>
                  </div>
                  <span className="tabular-nums text-sm text-stone-cinema">
                    {row.registrationCount}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-md border border-line bg-paper xl:col-span-2">
            <ReportPanelHeader
              title="First-timer return and follow-up effectiveness"
              description={`${attention.total} need attention · coverage ${report.followUpStatus.coveragePercent}% · ${proof.map((c) => c.fullName).join(", ")} counted once`}
            />
            <div className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <DashboardRegistrationsTrendChart
                points={metrics.registrationsTrend}
                trendDays={metrics.trendDays}
                compact
                rangeTimeZoneLabel={club.clock.timeZoneId}
                className="h-full min-h-[9rem]"
              />
              <dl className="grid grid-cols-2 gap-2 self-start text-sm">
                <div className="rounded-md bg-paper-warm px-3 py-2 ring-1 ring-line">
                  <dt className="text-[11px] text-stone-cinema">Due now</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
                    {attention.dueNow}
                  </dd>
                </div>
                <div className="rounded-md bg-paper-warm px-3 py-2 ring-1 ring-line">
                  <dt className="text-[11px] text-stone-cinema">At risk</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
                    {attention.atRisk}
                  </dd>
                </div>
                <div className="rounded-md bg-paper-warm px-3 py-2 ring-1 ring-line">
                  <dt className="text-[11px] text-stone-cinema">Opportunity</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
                    {attention.opportunity}
                  </dd>
                </div>
                <div className="rounded-md bg-paper-warm px-3 py-2 ring-1 ring-line">
                  <dt className="text-[11px] text-stone-cinema">Registrations this week</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
                    {metrics.registrationsInPeriod}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      </div>
    </MarketingDemoTheme>
  );
}
