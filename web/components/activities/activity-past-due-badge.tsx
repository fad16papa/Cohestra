import { cn } from "@/lib/utils";

type ActivityPastDueBadgeProps = {
  className?: string;
};

export function ActivityPastDueBadge({ className }: ActivityPastDueBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200",
        className
      )}
    >
      Past due, still published
    </span>
  );
}
