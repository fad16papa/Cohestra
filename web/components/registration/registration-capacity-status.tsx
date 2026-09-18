import type { RegistrationCapacitySummary } from "@/lib/registration-capacity-summary";

export function RegistrationCapacityStatus({
  summary,
}: {
  summary: RegistrationCapacitySummary;
}) {
  if (summary.kind === "hidden") {
    return null;
  }

  if (summary.kind === "going-only") {
    return (
      <p className="text-sm font-medium text-text-warm" aria-live="polite">
        {summary.label}
      </p>
    );
  }

  if (summary.kind === "full") {
    return (
      <p className="text-sm font-medium text-destructive" aria-live="polite">
        {summary.label}
      </p>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-warm"
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
