import Link from "next/link";

import { ActivityStatusBadge } from "@/components/activities/activity-status-badge";
import {
  DashboardPanelHeader,
  DashboardPanelSection,
} from "@/components/dashboard/dashboard-matched-panel";
import { buttonVariants } from "@/components/ui/button";
import type { ActivityPerformanceItem } from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

type DashboardActivityPerformanceTableProps = {
  items: ActivityPerformanceItem[];
  periodLabel: string;
};

export function DashboardActivityPerformanceTable({
  items,
  periodLabel,
}: DashboardActivityPerformanceTableProps) {
  return (
    <DashboardPanelSection aria-labelledby="activity-performance-table-heading">
      <DashboardPanelHeader
        headingId="activity-performance-table-heading"
        title="Activity performance"
        description={`Registrations by activity for ${periodLabel}.`}
      />

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-warm px-6 py-10 text-center text-sm text-text-muted-warm">
          No registrations {periodLabel} yet. Publish an activity to populate this table.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-warm bg-card/90">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wide text-text-muted-warm">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium sm:px-5">
                    #
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium sm:px-5">
                    Activity
                  </th>
                  <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell sm:px-5">
                    Community
                  </th>
                  <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell sm:px-5">
                    Category
                  </th>
                  <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell sm:px-5">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium sm:px-5">
                    Registrations
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-warm">
                {items.map((item, index) => (
                  <tr key={item.activityId} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 tabular-nums text-text-muted-warm sm:px-5">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-text-warm sm:px-5">
                      <Link
                        href={`/activities/${item.activityId}`}
                        className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {item.activityName}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-text-muted-warm md:table-cell sm:px-5">
                      {item.communityLabel || "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-text-muted-warm lg:table-cell sm:px-5">
                      {item.category || "—"}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell sm:px-5">
                      <ActivityStatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-text-warm sm:px-5">
                      {item.registrationCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border-warm px-4 py-3 sm:px-5">
            <Link
              href="/activities"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "h-8 px-2 text-text-muted-warm hover:text-text-warm"
              )}
            >
              View all activities
            </Link>
          </div>
        </div>
      )}
    </DashboardPanelSection>
  );
}
