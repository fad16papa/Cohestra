"use client";

import { BadgeCheck, Clock3, Filter, Users } from "lucide-react";

import type { ReportFilters, ReportResult } from "@/lib/reports-api";
import { cn } from "@/lib/utils";

type ReportTrustBarProps = {
  report: ReportResult;
  filters: ReportFilters;
  className?: string;
};

function formatComputedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function activeFilterCount(filters: ReportFilters): number {
  let count = 0;
  if (filters.activityId.trim()) count += 1;
  if (filters.community.trim()) count += 1;
  if (filters.leadStatus) count += 1;
  if (filters.referralSource.trim()) count += 1;
  return count;
}

export function ReportTrustBar({ report, filters, className }: ReportTrustBarProps) {
  const filtersApplied = activeFilterCount(filters);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border-warm bg-muted/15 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted-warm">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="size-3.5" aria-hidden />
          Computed {formatComputedAt(report.period.computedAt)} UTC
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3.5" aria-hidden />
          {report.leadGrowth.totalLeadsAtEnd} clients in cohort
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Filter className="size-3.5" aria-hidden />
          {filtersApplied === 0
            ? "No extra filters applied"
            : `${filtersApplied} filter${filtersApplied === 1 ? "" : "s"} applied`}
        </span>
      </div>
      <p className="inline-flex items-center gap-1.5 text-xs font-medium text-lagoon">
        <BadgeCheck className="size-3.5" aria-hidden />
        CSV export uses the same filters and totals shown here
      </p>
    </div>
  );
}
