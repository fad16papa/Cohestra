"use client";

import type { LimitDial } from "@/lib/shell/tenant-shell-api";
import { cn } from "@/lib/utils";

type LimitMeterProps = {
  dials: LimitDial[];
  compact?: boolean;
  className?: string;
};

export function LimitMeter({ dials, compact = false, className }: LimitMeterProps) {
  if (dials.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)} aria-label="Plan usage limits">
      {dials.map((dial) => (
        <div key={dial.key} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-text-muted-warm">{dial.label}</span>
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
              {dial.used}/{dial.limit}
            </span>
          </div>
          <div
            className={cn(
              "h-1.5 overflow-hidden rounded-full bg-muted",
              compact && "h-1"
            )}
            role="progressbar"
            aria-valuenow={dial.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${dial.label}: ${dial.percent}% used`}
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
          {dial.blocked ? (
            <p className="text-[11px] text-destructive" role="status">
              Limit reached — upgrade or free capacity before adding more.
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
