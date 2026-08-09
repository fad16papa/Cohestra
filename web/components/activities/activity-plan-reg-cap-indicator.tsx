import type { LimitDial } from "@/lib/shell/tenant-shell-api";
import { cn } from "@/lib/utils";

type ActivityPlanRegCapIndicatorProps = {
  dial: LimitDial;
  className?: string;
};

export function ActivityPlanRegCapIndicator({
  dial,
  className,
}: ActivityPlanRegCapIndicatorProps) {
  return (
    <div
      className={cn(
        "border-t border-border-warm px-4 pb-4 pt-3 sm:px-6",
        className
      )}
      role="status"
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-text-muted-warm">Plan registrations</span>
          <span
            className={cn(
              "font-medium tabular-nums",
              dial.blocked
                ? "text-destructive"
                : dial.warn
                  ? "text-gold"
                  : "text-text-warm"
            )}
          >
            {dial.used.toLocaleString()}/{dial.limit.toLocaleString()}
          </span>
        </div>
        <div
          className="h-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={dial.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Plan registrations: ${dial.percent}% used`}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              dial.blocked
                ? "bg-destructive"
                : dial.warn
                  ? "bg-gold"
                  : "bg-lagoon"
            )}
            style={{ width: `${Math.min(100, dial.percent)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
