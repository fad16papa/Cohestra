import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/clients-api";

const statusLabels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  active: "Active",
  inactive: "Inactive",
};

const statusStyles: Record<LeadStatus, string> = {
  new: "bg-status-new text-status-new-foreground",
  contacted: "bg-status-contacted text-status-contacted-foreground",
  active: "bg-status-active text-status-active-foreground",
  inactive: "bg-status-inactive text-status-inactive-foreground",
};

type LeadStatusBadgeProps = {
  status: LeadStatus;
  className?: string;
};

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit max-w-full shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        statusStyles[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
