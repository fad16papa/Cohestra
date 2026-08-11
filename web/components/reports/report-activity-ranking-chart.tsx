"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { ReportDonutChart } from "@/components/reports/report-donut-chart";
import { ReportHorizontalRankingChart } from "@/components/reports/report-horizontal-ranking-chart";
import {
  formatSharePercent,
  REPORT_RANKING_TOP_COUNT,
  ReportDepthCard,
  ReportPanelHeader,
  ReportRankBadge,
  ReportShareBar,
  truncateReportLabel,
} from "@/components/reports/report-visual-primitives";
import type { ReportActivityRankingItem } from "@/lib/reports-api";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-3)",
  "var(--chart-5)",
] as const;

type ReportActivityRankingChartProps = {
  items: ReportActivityRankingItem[];
};

export function ReportActivityRankingChart({ items }: ReportActivityRankingChartProps) {
  const visibleItems = items.slice(0, REPORT_RANKING_TOP_COUNT);
  const topCount = visibleItems[0]?.registrationCount ?? 0;
  const totalRegistrations = items.reduce((sum, item) => sum + item.registrationCount, 0);

  const chartItems = visibleItems.map((item, index) => ({
    id: item.activityId,
    shortLabel: `#${index + 1}`,
    fullLabel: item.activityName,
    value: item.registrationCount,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const donutSlices = chartItems.map((item) => ({
    id: item.id,
    label: truncateReportLabel(item.fullLabel, 28),
    value: item.value,
    color: item.color,
  }));

  return (
    <ReportDepthCard accent="lagoon" className="flex h-full flex-col overflow-hidden">
      <ReportPanelHeader
        title="Top activities"
        description="Where registrations concentrated — chart by rank, names in the list below."
        aside={
          visibleItems.length > 0 ? (
            <p className="text-right text-sm font-semibold tabular-nums text-text-warm">
              {totalRegistrations} total
            </p>
          ) : null
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        {visibleItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-warm px-6 py-10 text-center text-sm text-text-muted-warm">
            Rankings unlock on Core when activities receive registrations.
          </p>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_9rem] lg:items-center">
              <ReportHorizontalRankingChart items={chartItems} />
              <ReportDonutChart
                slices={donutSlices}
                centerValue={String(topCount)}
                centerLabel="Top activity"
                size="md"
              />
            </div>

            <ul className="space-y-2 border-t border-border-warm/70 pt-4">
              {visibleItems.map((item, index) => {
                const rank = index + 1;
                const shareOfTop =
                  topCount > 0 ? (item.registrationCount / topCount) * 100 : 0;
                const shareOfTotal = formatSharePercent(
                  item.registrationCount,
                  totalRegistrations
                );

                return (
                  <li key={item.activityId}>
                    <Link
                      href={`/activities/${item.activityId}`}
                      className="group flex items-start gap-3 rounded-lg px-1 py-1.5 transition-colors hover:bg-muted/30"
                    >
                      <ReportRankBadge rank={rank} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p
                              className="truncate text-sm font-semibold text-text-warm group-hover:text-lagoon"
                              title={item.activityName}
                            >
                              {truncateReportLabel(item.activityName, 44)}
                            </p>
                            {item.communityLabel ? (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-text-muted-warm">
                                <CalendarDays className="size-3 shrink-0" aria-hidden />
                                <span className="truncate" title={item.communityLabel}>
                                  {truncateReportLabel(item.communityLabel, 32)}
                                </span>
                              </p>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums text-text-warm">
                              {item.registrationCount}
                            </p>
                            <p className="text-[11px] text-text-muted-warm">{shareOfTotal}</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <ReportShareBar
                            percent={shareOfTop}
                            tone={rank === 1 ? "gold" : rank <= 3 ? "lagoon" : "muted"}
                          />
                        </div>
                      </div>
                    </Link>
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
