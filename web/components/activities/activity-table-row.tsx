import Link from "next/link";
import { AlertTriangle, Pencil } from "lucide-react";

import { ActivityStatusBadge } from "@/components/activities/activity-status-badge";
import { activitiesTableGridClassName } from "@/components/activities/activities-table-layout";
import { buttonVariants } from "@/components/ui/button";
import type { Activity } from "@/lib/activities-api";
import type { CalendarActivity } from "@/lib/activity-calendar-utils";
import { cn } from "@/lib/utils";

type ActivityTableRowProps = {
  activity: Activity;
  conflictingActivities?: CalendarActivity[];
};

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ActivityTableRow({
  activity,
  conflictingActivities = [],
}: ActivityTableRowProps) {
  const detailHref = `/activities/${activity.id}`;
  const hasConflict = conflictingActivities.length > 0;

  return (
    <div
      className={cn(
        activitiesTableGridClassName,
        "group border-b border-border-warm border-l-4 border-l-transparent py-3 transition-all last:border-b-0",
        "hover:border-l-primary hover:bg-muted/30"
      )}
      role="row"
    >
      <div className="min-w-0" role="cell">
        <Link
          href={detailHref}
          className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-sm font-medium text-text-warm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
        >
          {hasConflict ? (
            <AlertTriangle
              className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-label={`Schedule conflict with ${conflictingActivities.length} other activit${conflictingActivities.length === 1 ? "y" : "ies"}`}
            />
          ) : null}
          <span className="truncate" title={activity.name}>
            {activity.name}
          </span>
        </Link>
      </div>

      <div className="min-w-0 truncate text-sm text-text-muted-warm" role="cell" title={activity.communityLabel}>
        {activity.communityLabel || "—"}
      </div>

      <div className="min-w-0 truncate text-sm text-text-muted-warm" role="cell" title={activity.category}>
        {activity.category || "—"}
      </div>

      <div
        className="text-right tabular-nums text-sm font-semibold text-text-warm"
        role="cell"
      >
        {activity.registrationCount}
      </div>

      <div role="cell">
        <ActivityStatusBadge status={activity.status} />
      </div>

      <div
        className="min-w-0 truncate text-sm text-text-muted-warm"
        role="cell"
        title={activity.schedule}
      >
        {activity.schedule?.trim() ? activity.schedule : "—"}
      </div>

      <div className="min-w-0 text-sm tabular-nums text-text-muted-warm" role="cell">
        {formatCreatedAt(activity.createdAt)}
      </div>

      <div className="flex justify-end" role="cell">
        <Link
          href={detailHref}
          aria-label={`Edit ${activity.name}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "size-8 text-text-muted-warm opacity-70 transition-opacity group-hover:opacity-100 hover:text-text-warm"
          )}
        >
          <Pencil className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
