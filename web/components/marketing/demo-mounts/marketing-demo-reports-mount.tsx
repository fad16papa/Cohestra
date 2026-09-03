"use client";

import { MarketingDemoTheme } from "@/components/marketing/marketing-demo-theme";
import { useMarketingDemoClub } from "@/components/marketing/marketing-demo-provider";
import {
  ReportDepthCard,
  ReportPanelHeader,
  ReportRankBadge,
  ReportShareBar,
} from "@/components/reports/report-visual-primitives";
import { getReportsProofClients } from "@/lib/marketing/marketing-demo-club";

export function MarketingDemoReportsMount() {
  const club = useMarketingDemoClub();
  const report = club.reports;
  const proof = getReportsProofClients(club);
  // Defensive math: ensure we never compute NaN/Infinity or negative percentages
  // if a fixture ever changes to include bad values.
  const safeRows = report.activityRanking.map((row) => ({
    ...row,
    registrationCount:
      Number.isFinite(row.registrationCount) && row.registrationCount > 0
        ? row.registrationCount
        : 0,
  }));
  const total = safeRows.reduce((sum, row) => sum + row.registrationCount, 0);
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 1;

  return (
    <MarketingDemoTheme>
      <div className="flex h-full min-h-0 flex-col gap-3 bg-paper-warm p-3">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            ["Registrations", String(report.registrations)],
            ["Total clients", String(report.leadGrowth.totalLeadsAtEnd)],
            ["Follow-up", `${report.followUpStatus.coveragePercent}%`],
            ["New leads", String(report.newLeads)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-paper px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-cinema">
                {label}
              </p>
              <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-cinema">
          {proof.map((client) => client.fullName).join(", ")} counted once this week · Sunday
          clinic and board games night
        </p>
        <ReportDepthCard className="min-h-0 flex-1" accent="lagoon">
          <ReportPanelHeader
            title="Activity ranking"
            description="Sunday clinic leads the week"
          />
          <ul className="space-y-3 px-4 py-3">
            {safeRows.map((row, index) => (
              <li key={row.activityId} className="flex items-center gap-3">
                <ReportRankBadge rank={index + 1} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{row.activityName}</p>
                  <div className="mt-1">
                    <ReportShareBar
                      percent={(row.registrationCount / safeTotal) * 100}
                    />
                  </div>
                </div>
                <span className="tabular-nums text-sm text-stone-cinema">
                  {row.registrationCount}
                </span>
              </li>
            ))}
          </ul>
        </ReportDepthCard>
      </div>
    </MarketingDemoTheme>
  );
}
