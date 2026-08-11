"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DashboardChartCardProps = {
  headingId: string;
  title: string;
  description: string;
  children: ReactNode;
  headerAside?: ReactNode;
  className?: string;
  contentClassName?: string;
};

/** Consistent card chrome for dashboard charts — quiet border, generous padding. */
export function DashboardChartCard({
  headingId,
  title,
  description,
  children,
  headerAside,
  className,
  contentClassName,
}: DashboardChartCardProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex flex-col rounded-xl border border-border-warm bg-card/90 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-warm/70 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h3 id={headingId} className="text-section text-text-warm">
            {title}
          </h3>
          <p className="mt-1 text-sm text-text-muted-warm">{description}</p>
        </div>
        {headerAside ? <div className="shrink-0">{headerAside}</div> : null}
      </div>
      <div className={cn("flex flex-1 flex-col p-4 sm:p-5", contentClassName)}>
        {children}
      </div>
    </section>
  );
}

type ChartTooltipRow = {
  label: string;
  value: string;
  color?: string;
};

type ChartTooltipFrameProps = {
  title: string;
  rows: ChartTooltipRow[];
  className?: string;
};

/** Recharts tooltip content styled with brand tokens (works in light + dark). */
export function ChartTooltipFrame({ title, rows, className }: ChartTooltipFrameProps) {
  return (
    <div
      className={cn(
        "min-w-[10rem] rounded-lg border border-border-warm bg-popover px-3 py-2.5 text-popover-foreground shadow-md",
        className
      )}
    >
      <p className="text-xs font-semibold text-text-warm">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 text-text-muted-warm">
              {row.color ? (
                <span
                  aria-hidden
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
              ) : null}
              {row.label}
            </span>
            <span className="tabular-nums font-semibold text-text-warm">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function formatChartDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
