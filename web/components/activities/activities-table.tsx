"use client";

import { ActivityTableRow } from "@/components/activities/activity-table-row";
import {
  activitiesTableGridClassName,
  activitiesTableHeaderClassName,
} from "@/components/activities/activities-table-layout";
import { TableSkeleton } from "@/components/shared/list-skeleton";
import type { Activity } from "@/lib/activities-api";
import type { CalendarActivity } from "@/lib/activity-calendar-utils";
import { cn } from "@/lib/utils";

type ActivitiesTableProps = {
  activities: Activity[];
  getConflictsForActivity?: (activityId: string) => CalendarActivity[];
  isLoading?: boolean;
  isFetching?: boolean;
  skeletonRows?: number;
};

export function ActivitiesTable({
  activities,
  getConflictsForActivity,
  isLoading = false,
  isFetching = false,
  skeletonRows = 8,
}: ActivitiesTableProps) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border-warm bg-card shadow-sm"
      aria-busy={isLoading || isFetching}
    >
      <div className="overflow-x-auto">
        <div className="min-w-[56rem]" role="table" aria-label="Activities">
          <div
            className={cn(
              activitiesTableGridClassName,
              "border-b border-border-warm bg-muted/30 py-3"
            )}
            role="row"
          >
            <span className={activitiesTableHeaderClassName} role="columnheader">
              Activity
            </span>
            <span className={activitiesTableHeaderClassName} role="columnheader">
              Community
            </span>
            <span className={activitiesTableHeaderClassName} role="columnheader">
              Category
            </span>
            <span
              className={cn(activitiesTableHeaderClassName, "text-right")}
              role="columnheader"
            >
              Registrants
            </span>
            <span className={activitiesTableHeaderClassName} role="columnheader">
              Status
            </span>
            <span className={activitiesTableHeaderClassName} role="columnheader">
              Event date
            </span>
            <span className={activitiesTableHeaderClassName} role="columnheader">
              Created
            </span>
            <span className="sr-only" role="columnheader">
              Actions
            </span>
          </div>

          <div
            className={cn(
              "transition-opacity duration-200",
              isFetching && !isLoading && "pointer-events-none opacity-50"
            )}
            role="rowgroup"
          >
            {isLoading ? (
              <TableSkeleton rows={skeletonRows} columns={8} />
            ) : (
              activities.map((activity) => (
                <ActivityTableRow
                  key={activity.id}
                  activity={activity}
                  conflictingActivities={getConflictsForActivity?.(activity.id) ?? []}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
