"use client";

import { Layers3 } from "lucide-react";

import {
  formatSharePercent,
  ReportDepthCard,
  ReportPanelHeader,
  ReportRankBadge,
  ReportShareBar,
  truncateReportLabel,
} from "@/components/reports/report-visual-primitives";
import type { ReportCommunityRankingItem } from "@/lib/reports-api";

type ReportCommunityRankingPanelProps = {
  items: ReportCommunityRankingItem[];
  totalRegistrations: number;
};

export function ReportCommunityRankingPanel({
  items,
  totalRegistrations,
}: ReportCommunityRankingPanelProps) {
  const visibleItems = items.slice(0, 8);
  const topCount = visibleItems[0]?.registrationCount ?? 0;

  return (
    <ReportDepthCard accent="lagoon" className="overflow-hidden">
      <ReportPanelHeader
        title="Community ranking"
        description="Which communities drove the most registrations in this report."
        aside={
          visibleItems.length > 0 ? (
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-warm">
              <Layers3 className="size-4 text-lagoon" aria-hidden />
              {visibleItems.length} communit{visibleItems.length === 1 ? "y" : "ies"}
            </p>
          ) : null
        }
      />

      <div className="p-4 sm:p-5">
        {visibleItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-warm px-6 py-10 text-center text-sm text-text-muted-warm">
            Community rankings appear when activities include community labels.
          </p>
        ) : (
          <ul className="space-y-3">
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
                  className="rounded-xl border border-border-warm/80 bg-gradient-to-br from-card via-card to-lagoon/[0.03] p-3.5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <ReportRankBadge rank={rank} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className="truncate text-sm font-semibold text-text-warm"
                            title={item.communityLabel}
                          >
                            {truncateReportLabel(item.communityLabel, 52)}
                          </p>
                          <p className="mt-0.5 text-xs text-text-muted-warm">
                            {shareOfReport} of report registrations
                          </p>
                        </div>
                        <p className="shrink-0 text-lg font-semibold tabular-nums text-text-warm">
                          {item.registrationCount}
                        </p>
                      </div>
                      <div className="mt-2.5 space-y-1">
                        <ReportShareBar
                          percent={shareOfTop}
                          tone={rank === 1 ? "gold" : rank <= 3 ? "lagoon" : "muted"}
                        />
                        {rank === 1 ? (
                          <p className="text-[11px] font-medium text-lagoon">
                            Leading community this period
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ReportDepthCard>
  );
}
