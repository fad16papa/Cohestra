import Link from "next/link";

import {
  DashboardPanelHeader,
  DashboardPanelSection,
} from "@/components/dashboard/dashboard-matched-panel";
import type { ActivityPerformanceItem } from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

type DashboardActivityPerformanceGraphProps = {
  items: ActivityPerformanceItem[];
  periodLabel: string;
};

export function DashboardActivityPerformanceGraph({
  items,
  periodLabel,
}: DashboardActivityPerformanceGraphProps) {
  const maxRegistrations = Math.max(...items.map((item) => item.registrationCount), 1);
  const topItems = items.slice(0, 12);

  return (
    <DashboardPanelSection aria-labelledby="activity-performance-graph-heading">
      <DashboardPanelHeader
        headingId="activity-performance-graph-heading"
        title="Activity performance"
        description={`Registration volume by activity for ${periodLabel}.`}
      />

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-warm px-6 py-10 text-center text-sm text-text-muted-warm">
          No registrations {periodLabel} yet. Publish an activity to populate this chart.
        </p>
      ) : (
        <div className="space-y-3 rounded-xl border border-border-warm bg-card/90 p-4 sm:p-5">
          <ul className="space-y-3">
            {topItems.map((item, index) => {
              const widthPercent = Math.max(
                6,
                Math.round((item.registrationCount / maxRegistrations) * 100)
              );

              return (
                <li key={item.activityId}>
                  <Link
                    href={`/activities/${item.activityId}`}
                    className="group block rounded-lg px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium text-text-warm group-hover:text-primary">
                        <span className="mr-2 text-xs tabular-nums text-text-muted-warm">
                          #{index + 1}
                        </span>
                        {item.activityName}
                      </span>
                      <span className="shrink-0 tabular-nums font-semibold text-text-warm">
                        {item.registrationCount}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-muted/60 sm:h-3.5">
                      <div
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
                        )}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          {items.length > topItems.length ? (
            <p className="text-xs text-text-muted-warm">
              Showing top {topItems.length} of {items.length} activities.
            </p>
          ) : null}
        </div>
      )}
    </DashboardPanelSection>
  );
}
