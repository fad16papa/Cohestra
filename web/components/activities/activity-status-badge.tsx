import { cn } from "@/lib/utils";
import type { ActivityStatus } from "@/lib/activities-api";

const statusLabels: Record<ActivityStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

const statusStyles: Record<ActivityStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-status-active text-status-active-foreground",
  archived: "bg-status-inactive text-status-inactive-foreground",
};

type ActivityStatusBadgeProps = {
  status: ActivityStatus;
  className?: string;
};

export function ActivityStatusBadge({ status, className }: ActivityStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
