import Link from "next/link";

import { ActivityStatusBadge } from "@/components/activities/activity-status-badge";
import {
  DashboardPanelHeader,
  DashboardPanelSection,
} from "@/components/dashboard/dashboard-matched-panel";
import {
  DASHBOARD_TABLE_VISIBLE_ROWS,
  DashboardScrollTable,
  DashboardScrollTableHead,
} from "@/components/dashboard/dashboard-scroll-table";
import { buttonVariants } from "@/components/ui/button";
import type { ActivityPerformanceItem } from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

type DashboardActivityPerformanceTableProps = {
  items: ActivityPerformanceItem[];
  periodLabel: string;
};

function formatShare(count: number, total: number): string {
  if (total === 0) {
    return "—";
  }

  const percent = (count / total) * 100;
  return `${percent >= 10 ? Math.round(percent) : percent.toFixed(1)}%`;
}

export function DashboardActivityPerformanceTable({
  items,
  periodLabel,
}: DashboardActivityPerformanceTableProps) {
  const totalRegistrations = items.reduce(
    (sum, item) => sum + item.registrationCount,
    0
  );
  const hasMore = items.length > DASHBOARD_TABLE_VISIBLE_ROWS;
  const topRegistrationCount = items[0]?.registrationCount ?? 0;

  return (
    <DashboardPanelSection aria-labelledby="activity-performance-table-heading">
      <DashboardPanelHeader
        headingId="activity-performance-table-heading"
        title="Activity performance"
        description={`Top activities by registrations ${periodLabel}.`}
        action={
          items.length > 0 ? (
            <Link
              href="/activities"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "hidden h-8 shrink-0 sm:inline-flex"
              )}
            >
              All activities
            </Link>
          ) : null
        }
      />

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-warm px-6 py-10 text-center text-sm text-text-muted-warm">
          No registrations {periodLabel} yet. Publish an activity to populate this table.
        </p>
      ) : (
        <DashboardScrollTable
          itemCount={items.length}
          scrollAriaLabel={`Activity performance table. ${hasMore ? `Showing top ${DASHBOARD_TABLE_VISIBLE_ROWS}; scroll for more.` : `${items.length} activities.`}`}
          footer={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {hasMore ? (
                <p className="text-xs text-text-muted-warm">
                  Showing top {DASHBOARD_TABLE_VISIBLE_ROWS} of {items.length} activities — scroll
                  for more.
                </p>
              ) : (
                <p className="text-xs tabular-nums text-text-muted-warm">
                  {items.length} activit{items.length === 1 ? "y" : "ies"} ·{" "}
                  {totalRegistrations} registration{totalRegistrations === 1 ? "" : "s"}{" "}
                  {periodLabel}
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
          <table className="w-full min-w-[40rem] text-left text-sm">
            <DashboardScrollTableHead>
              <tr>
                <th scope="col" className="w-10 px-4 py-2.5 font-medium sm:px-5">
                  #
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">
                  Activity
                </th>
                <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell sm:px-5">
                  Community
                </th>
                <th scope="col" className="hidden px-4 py-2.5 font-medium lg:table-cell sm:px-5">
                  Category
                </th>
                <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell sm:px-5">
                  Status
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium sm:px-5">
                  Registrations
                </th>
                <th scope="col" className="hidden min-w-[7rem] px-4 py-2.5 text-right font-medium sm:table-cell sm:px-5">
                  Share
                </th>
              </tr>
            </DashboardScrollTableHead>
            <tbody className="divide-y divide-border-warm">
              {items.map((item, index) => {
                const barWidth =
                  topRegistrationCount > 0
                    ? (item.registrationCount / topRegistrationCount) * 100
                    : 0;

                return (
                  <tr
                    key={item.activityId}
                    className="h-[var(--dashboard-table-row-height)] transition-colors hover:bg-muted/20"
                  >
                    <td className="px-4 py-2 tabular-nums text-text-muted-warm sm:px-5">
                      {index + 1}
                    </td>
                    <td className="max-w-[14rem] px-4 py-2 font-medium text-text-warm sm:max-w-none sm:px-5">
                      <Link
                        href={`/activities/${item.activityId}`}
                        className="block truncate hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title={item.activityName}
                      >
                        {item.activityName}
                      </Link>
                    </td>
                    <td className="hidden max-w-[10rem] truncate px-4 py-2 text-text-muted-warm md:table-cell sm:px-5">
                      {item.communityLabel || "—"}
                    </td>
                    <td className="hidden max-w-[8rem] truncate px-4 py-2 text-text-muted-warm lg:table-cell sm:px-5">
                      {item.category || "—"}
                    </td>
                    <td className="hidden px-4 py-2 sm:table-cell sm:px-5">
                      <ActivityStatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-text-warm sm:px-5">
                      {item.registrationCount}
                    </td>
                    <td className="hidden px-4 py-2 sm:table-cell sm:px-5">
                      <div className="flex items-center justify-end gap-2">
                        <div
                          className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted/60 lg:block"
                          aria-hidden
                        >
                          <div
                            className="h-full rounded-full bg-primary/70"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="min-w-[2.5rem] text-right tabular-nums text-text-muted-warm">
                          {formatShare(item.registrationCount, totalRegistrations)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DashboardScrollTable>
      )}
    </DashboardPanelSection>
  );
}
