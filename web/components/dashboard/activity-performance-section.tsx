import Link from "next/link";

import {
  DASHBOARD_PANEL_VISIBLE_ITEMS,
  DashboardMatchedPanel,
  DashboardPanelHeader,
  DashboardPanelSection,
} from "@/components/dashboard/dashboard-matched-panel";
import { ActivityPerformanceRow } from "@/components/dashboard/activity-performance-row";
import { buttonVariants } from "@/components/ui/button";
import type { ActivityPerformanceItem } from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

type ActivityPerformanceSectionProps = {
  items: ActivityPerformanceItem[];
  periodLabel: string;
};

export function ActivityPerformanceSection({
  items,
  periodLabel,
}: ActivityPerformanceSectionProps) {
  const hasMore = items.length > DASHBOARD_PANEL_VISIBLE_ITEMS;

  return (
    <DashboardPanelSection aria-labelledby="activity-performance-heading">
      <DashboardPanelHeader
        headingId="activity-performance-heading"
        title="Activity performance"
        description={`Registrations by activity for ${periodLabel}, ranked by volume.`}
      />

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-warm px-6 py-10 text-center text-sm text-text-muted-warm">
          No registrations {periodLabel} yet. Publish an activity and share its
          registration link to start ranking performance here.
        </p>
      ) : (
        <DashboardMatchedPanel
          itemCount={items.length}
          scrollAriaLabel={`Activity performance rankings. ${hasMore ? `Showing top ${DASHBOARD_PANEL_VISIBLE_ITEMS}; scroll for more.` : `${items.length} activities.`}`}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {hasMore ? (
                <p className="text-xs text-text-muted-warm">
                  Showing top {DASHBOARD_PANEL_VISIBLE_ITEMS} of {items.length} —
                  scroll the list for more.
                </p>
              ) : (
                <p className="text-xs text-text-muted-warm">
                  {items.length} activit{items.length === 1 ? "y" : "ies"} ranked
                  {periodLabel ? ` ${periodLabel}` : ""}.
                </p>
              )}
              <Link
                href="/activities"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-8 shrink-0 self-start px-2 text-text-muted-warm hover:text-text-warm sm:self-auto"
                )}
              >
                View all activities
              </Link>
            </div>
          }
        >
          <ol className="divide-y divide-border-warm">
            {items.map((item, index) => (
              <li key={item.activityId}>
                <ActivityPerformanceRow item={item} rank={index + 1} />
              </li>
            ))}
          </ol>
        </DashboardMatchedPanel>
      )}
    </DashboardPanelSection>
  );
}
