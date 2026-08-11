"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";

import {
  formatSharePercent,
  ReportDepthCard,
  ReportPanelHeader,
  ReportRankBadge,
  ReportShareBar,
  truncateReportLabel,
} from "@/components/reports/report-visual-primitives";
import type { ReportActivityRankingItem } from "@/lib/reports-api";

type ReportActivityRankingChartProps = {
  items: ReportActivityRankingItem[];
};

export function ReportActivityRankingChart({ items }: ReportActivityRankingChartProps) {
  const visibleItems = items.slice(0, 8);
  const topCount = visibleItems[0]?.registrationCount ?? 0;
  const totalRegistrations = items.reduce((sum, item) => sum + item.registrationCount, 0);

  return (
    <ReportDepthCard accent="lagoon" className="overflow-hidden">
      <ReportPanelHeader
        title="Top activities"
        description="Ranked by registration volume — bars show share of your busiest activity."
        aside={
          visibleItems.length > 0 ? (
            <p className="text-right text-sm font-semibold tabular-nums text-text-warm">
              {totalRegistrations} total
            </p>
          ) : null
        }
      />

      <div className="p-4 sm:p-5">
        {visibleItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-warm px-6 py-10 text-center text-sm text-text-muted-warm">
            Rankings unlock on Core when activities receive registrations.
          </p>
        ) : (
          <ul className="space-y-3">
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
                    className="group block rounded-xl border border-border-warm/80 bg-gradient-to-br from-card to-muted/20 p-3.5 shadow-sm transition-all hover:border-lagoon/30 hover:shadow-[0_12px_28px_rgba(7,13,18,0.08)]"
                  >
                    <div className="flex items-start gap-3">
                      <ReportRankBadge rank={rank} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className="truncate text-sm font-semibold text-text-warm group-hover:text-lagoon"
                              title={item.activityName}
                            >
                              {truncateReportLabel(item.activityName, 56)}
                            </p>
                            {item.communityLabel ? (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-text-muted-warm">
                                <CalendarDays className="size-3 shrink-0" aria-hidden />
                                <span className="truncate" title={item.communityLabel}>
                                  {truncateReportLabel(item.communityLabel, 40)}
                                </span>
                              </p>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-lg font-semibold tabular-nums text-text-warm">
                              {item.registrationCount}
                            </p>
                            <p className="text-[11px] text-text-muted-warm">
                              {shareOfTotal} of report
                            </p>
                          </div>
                        </div>
                        <div className="mt-2.5">
                          <ReportShareBar
                            percent={shareOfTop}
                            tone={rank === 1 ? "gold" : rank <= 3 ? "lagoon" : "muted"}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ReportDepthCard>
  );
}
