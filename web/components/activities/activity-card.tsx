import Link from "next/link";

import { ActivityScheduleConflictAlert } from "@/components/activities/activity-schedule-conflict-alert";
import { ActivityStatusBadge } from "@/components/activities/activity-status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Activity } from "@/lib/activities-api";
import type { CalendarActivity } from "@/lib/activity-calendar-utils";
import { cn } from "@/lib/utils";

type ActivityCardProps = {
  activity: Activity;
  conflictingActivities?: CalendarActivity[];
  className?: string;
};

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ActivityCard({
  activity,
  conflictingActivities = [],
  className,
}: ActivityCardProps) {
  const hasConflict = conflictingActivities.length > 0;

  return (
    <Card
      className={cn(
        "border-border-warm transition-shadow hover:shadow-md",
        hasConflict && "border-amber-200/80 dark:border-amber-900/50",
        className
      )}
    >
      <Link href={`/activities/${activity.id}`} className="block">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-section text-text-warm">
              {activity.name}
            </CardTitle>
            <ActivityStatusBadge status={activity.status} />
          </div>
          <CardDescription className="flex flex-wrap items-center gap-2 text-text-muted-warm">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
              {activity.communityLabel}
            </span>
            <span>{activity.category}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pb-4 text-sm text-text-muted-warm">
          <p>{activity.schedule}</p>
          <p>{activity.location}</p>
          <p className="text-xs">
            {activity.registrationCount} registration
            {activity.registrationCount === 1 ? "" : "s"}
          </p>
          <p className="text-xs">
            Created {formatCreatedAt(activity.createdAt)}
          </p>
        </CardContent>
      </Link>
      {hasConflict ? (
        <div className="border-t border-amber-100/90 px-4 pb-4 pt-3 dark:border-amber-900/40 sm:px-6">
          <ActivityScheduleConflictAlert
            conflictingActivities={conflictingActivities}
            variant="compact"
          />
        </div>
      ) : null}
    </Card>
  );
}
