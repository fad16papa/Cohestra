import Link from "next/link";

import { ActivityCardQuickActions } from "@/components/activities/activity-card-quick-actions";
import { ActivityPlanRegCapIndicator } from "@/components/activities/activity-plan-reg-cap-indicator";
import { ActivityScheduleConflictAlert } from "@/components/activities/activity-schedule-conflict-alert";
import { ActivityPastDueBadge } from "@/components/activities/activity-past-due-badge";
import { ActivitySignUpsPausedBadge } from "@/components/activities/activity-sign-ups-paused-badge";
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
import {
  shouldShowPlanRegCapOnActivityCard,
  shouldShowSignUpsPausedBadge,
} from "@/lib/plan-limit-utils";
import type { LimitDial } from "@/lib/shell/tenant-shell-api";
import { cn } from "@/lib/utils";

type ActivityCardProps = {
  activity: Activity;
  conflictingActivities?: CalendarActivity[];
  planRegistrationsDial?: LimitDial | null;
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

function formatRegistrationLine(activity: Activity): string {
  if (
    activity.status === "published" &&
    activity.maxRegistrants != null
  ) {
    return `${activity.registrationCount} / ${activity.maxRegistrants} activity registrations`;
  }

  return `${activity.registrationCount} registration${
    activity.registrationCount === 1 ? "" : "s"
  }`;
}

export function ActivityCard({
  activity,
  conflictingActivities = [],
  planRegistrationsDial = null,
  className,
}: ActivityCardProps) {
  const hasConflict = conflictingActivities.length > 0;
  const showPlanRegCap = shouldShowPlanRegCapOnActivityCard(
    activity.status,
    planRegistrationsDial
  );
  const showSignUpsPaused = shouldShowSignUpsPausedBadge(
    activity.status,
    planRegistrationsDial
  );
  const showPastDueStillPublished =
    activity.status === "published" && activity.isRegistrationOpen === false;

  return (
    <Card
      className={cn(
        "h-full border-border-warm transition-shadow hover:shadow-md",
        hasConflict && "border-amber-200/80 dark:border-amber-900/50",
        className
      )}
    >
      <Link href={`/activities/${activity.id}`} className="flex flex-1 flex-col">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-section text-text-warm">
              {activity.name}
            </CardTitle>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <ActivityStatusBadge status={activity.status} />
              {showPastDueStillPublished ? <ActivityPastDueBadge /> : null}
              {showSignUpsPaused ? <ActivitySignUpsPausedBadge /> : null}
            </div>
          </div>
          <CardDescription className="flex flex-wrap items-center gap-2 text-text-muted-warm">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
              {activity.communityLabel}
            </span>
            <span>{activity.category}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 space-y-2 pb-4 text-sm text-text-muted-warm">
          <p>{activity.schedule}</p>
          <p>{activity.location}</p>
          <p className="text-xs">{formatRegistrationLine(activity)}</p>
          <p className="text-xs">
            Created {formatCreatedAt(activity.createdAt)}
          </p>
        </CardContent>
      </Link>
      <div className="mt-auto divide-y divide-border-warm border-t border-border-warm">
        <ActivityCardQuickActions activity={activity} className="border-0" />
        {showPlanRegCap && planRegistrationsDial ? (
          <ActivityPlanRegCapIndicator
            dial={planRegistrationsDial}
            className="border-0"
          />
        ) : null}
        {hasConflict ? (
          <div className="px-4 py-3 sm:px-6">
            <ActivityScheduleConflictAlert
              conflictingActivities={conflictingActivities}
              variant="compact"
            />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
