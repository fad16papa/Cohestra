import Link from "next/link";

import { ActivityStatusBadge } from "@/components/activities/activity-status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Activity } from "@/lib/activities-api";
import { cn } from "@/lib/utils";

type ActivityCardProps = {
  activity: Activity;
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

export function ActivityCard({ activity, className }: ActivityCardProps) {
  return (
    <Link href={`/activities/${activity.id}`} className={cn("block", className)}>
      <Card className="border-border-warm transition-shadow hover:shadow-md">
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
        <CardContent className="space-y-2 text-sm text-text-muted-warm">
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
      </Card>
    </Link>
  );
}
