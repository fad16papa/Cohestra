"use client";

import { Layers3 } from "lucide-react";

import { ReportDonutChart } from "@/components/reports/report-donut-chart";
import {
  formatSharePercent,
  REPORT_RANKING_TOP_COUNT,
  ReportDepthCard,
  ReportPanelHeader,
  ReportRankBadge,
  ReportShareBar,
  truncateReportLabel,
} from "@/components/reports/report-visual-primitives";
import type { ReportCommunityRankingItem } from "@/lib/reports-api";

const CHART_COLORS = [
  "var(--chart-2)",
  "var(--chart-1)",
  "var(--chart-4)",
  "var(--chart-3)",
  "var(--chart-5)",
] as const;

type ReportCommunityRankingPanelProps = {
  items: ReportCommunityRankingItem[];
  totalRegistrations: number;
};

export function ReportCommunityRankingPanel({
  items,
  totalRegistrations,
}: ReportCommunityRankingPanelProps) {
  const visibleItems = items.slice(0, REPORT_RANKING_TOP_COUNT);
  const topCount = visibleItems[0]?.registrationCount ?? 0;

  const donutSlices = visibleItems.map((item, index) => ({
    id: `${item.communityLabel}-${index}`,
    label: truncateReportLabel(item.communityLabel, 28),
    fullLabel: item.communityLabel,
    value: item.registrationCount,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <ReportDepthCard accent="lagoon" className="flex h-full flex-col overflow-hidden">
      <ReportPanelHeader
        title="Community ranking"
        description="Communities driving registrations — hover segments for share, details in the list below."
        aside={
          visibleItems.length > 0 ? (
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-warm">
              <Layers3 className="size-4 text-lagoon" aria-hidden />
              {visibleItems.length} communit{visibleItems.length === 1 ? "y" : "ies"}
            </p>
          ) : null
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        {visibleItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-warm px-6 py-10 text-center text-sm text-text-muted-warm">
            Community rankings appear when activities include community labels.
          </p>
        ) : (
          <>
            <div className="flex justify-center py-2">
              <ReportDonutChart
                slices={donutSlices}
                centerValue={formatSharePercent(topCount, totalRegistrations)}
                centerLabel="Leader share"
                size="lg"
              />
            </div>

            <ul className="space-y-2 border-t border-border-warm/70 pt-4">
              {visibleItems.map((item, index) => {
                const rank = index + 1;
                const shareOfReport = formatSharePercent(
                  item.registrationCount,
                  totalRegistrations
                );
                const shareOfTop =
                  topCount > 0 ? (item.registrationCount / topCount) * 100 : 0;

                return (
                  <li
                    key={`${item.communityLabel}-${index}`}
                    className="flex items-start gap-3 rounded-lg px-1 py-1.5"
                  >
                    <ReportRankBadge rank={rank} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className="truncate text-sm font-semibold text-text-warm"
                            title={item.communityLabel}
                          >
                            {truncateReportLabel(item.communityLabel, 44)}
                          </p>
                          <p className="mt-0.5 text-xs text-text-muted-warm">
                            {shareOfReport} of report · {item.registrationCount} registrations
                          </p>
                        </div>
                        {rank === 1 ? (
                          <span className="shrink-0 rounded-full bg-lagoon/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lagoon">
                            Leader
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2">
                        <ReportShareBar
                          percent={shareOfTop}
                          tone={rank === 1 ? "gold" : rank <= 3 ? "lagoon" : "muted"}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </ReportDepthCard>
  );
}
