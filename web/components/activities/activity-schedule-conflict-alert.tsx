"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import type { CalendarActivity } from "@/lib/activity-calendar-utils";
import {
  DEFAULT_ACTIVITY_DURATION_MINUTES,
  formatActivityConflictMessage,
} from "@/lib/activity-calendar-utils";
import { cn } from "@/lib/utils";

type ActivityScheduleConflictAlertProps = {
  conflictingActivities: CalendarActivity[];
  variant?: "banner" | "compact" | "inline";
  showLinks?: boolean;
  className?: string;
};

export function ActivityScheduleConflictAlert({
  conflictingActivities,
  variant = "banner",
  showLinks = false,
  className,
}: ActivityScheduleConflictAlertProps) {
  if (conflictingActivities.length === 0) {
    return null;
  }

  const isCompact = variant === "compact";
  const isInline = variant === "inline";

  return (
    <div
      role="status"
      className={cn(
        "flex gap-2.5 rounded-lg border border-amber-200/90 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/35",
        isCompact ? "px-2.5 py-2" : "px-3 py-2.5 sm:px-3.5 sm:py-3",
        isInline && "border-amber-200/70 bg-amber-50/60",
        className
      )}
    >
      <TriangleAlert
        className={cn(
          "shrink-0 text-amber-600 dark:text-amber-400",
          isCompact ? "mt-0.5 size-3.5" : "mt-0.5 size-4"
        )}
        aria-hidden
      />
      <div className="min-w-0 space-y-1">
        {!isCompact && !isInline ? (
          <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
            Schedule conflict
          </p>
        ) : null}

        {showLinks ? (
          <div className="space-y-1.5">
            <p className="text-xs text-amber-900/90 dark:text-amber-100/90">
              This activity overlaps another on the same day (assumes{" "}
              {DEFAULT_ACTIVITY_DURATION_MINUTES}-minute events).
            </p>
            <ul className="space-y-1">
              {conflictingActivities.map((activity) => (
                <li key={activity.id} className="text-xs leading-snug">
                  <Link
                    href={`/activities/${activity.id}`}
                    className="font-medium text-amber-950 underline decoration-amber-400/70 underline-offset-2 hover:text-amber-900 dark:text-amber-50"
                  >
                    {activity.name}
                  </Link>
                  {activity.schedule ? (
                    <span className="text-amber-900/75 dark:text-amber-200/75">
                      {" "}
                      · {activity.schedule}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p
            className={cn(
              "text-amber-900/90 dark:text-amber-100/90",
              isCompact || isInline ? "text-xs leading-snug" : "text-sm leading-snug"
            )}
          >
            {formatActivityConflictMessage(conflictingActivities)}
          </p>
        )}
      </div>
    </div>
  );
}
