import type { RegistrationCapacitySummary } from "@/lib/registration-capacity-summary";
import { cn } from "@/lib/utils";

export function RegistrationCapacityStatus({
  summary,
  className,
}: {
  summary: RegistrationCapacitySummary;
  className?: string;
}) {
  if (summary.kind === "hidden") {
    return null;
  }

  if (summary.kind === "going-only") {
    return (
      <p
        className={cn("text-sm font-medium text-text-warm", className)}
        aria-live="polite"
      >
        {summary.label}
      </p>
    );
  }

  if (summary.kind === "full") {
    return (
      <p
        className={cn("text-sm font-medium text-destructive", className)}
        aria-live="polite"
      >
        {summary.label}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-warm",
        className
      )}
      aria-live="polite"
    >
      <span className="font-medium">{summary.goingLabel}</span>
      <span className="text-text-muted-warm" aria-hidden>
        ·
      </span>
      <span>{summary.spotsLabel}</span>
    </div>
  );
}
