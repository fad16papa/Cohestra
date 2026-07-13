import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ActivityStatusBadge } from "@/components/activities/activity-status-badge";
import type { ActivityPerformanceItem } from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

type ActivityPerformanceRowProps = {
  item: ActivityPerformanceItem;
  rank: number;
};

export function ActivityPerformanceRow({
  item,
  rank,
}: ActivityPerformanceRowProps) {
  const metaParts = [item.communityLabel, item.category].filter(
    (value) => value.trim().length > 0
  );
  const metaLine = metaParts.join(" · ");
  const showStatus = item.status !== "published";

  return (
    <Link
      href={`/activities/${item.activityId}`}
      aria-label={`View ${item.activityName} — ${item.registrationCount} registrations`}
      className={cn(
        "group flex min-h-[var(--dashboard-panel-row-height,4.5rem)] items-center gap-2.5 px-3 py-2.5 transition-colors sm:gap-4 sm:px-4 sm:py-3",
        "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      )}
    >
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-xs font-semibold tabular-nums text-text-muted-warm sm:size-9"
      >
        {rank}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="truncate text-sm font-semibold text-text-warm group-hover:text-primary"
            title={item.activityName}
          >
            {item.activityName}
          </span>
          {showStatus ? (
            <ActivityStatusBadge status={item.status} className="hidden shrink-0 sm:inline-flex" />
          ) : null}
        </span>
        {metaLine ? (
          <span
            className="mt-0.5 block truncate text-xs text-text-muted-warm"
            title={metaLine}
          >
            {metaLine}
          </span>
        ) : null}
      </span>

      <span className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <span className="text-right">
          <span className="block tabular-nums text-base font-semibold leading-none text-text-warm sm:text-lg">
            {item.registrationCount}
          </span>
          <span className="mt-0.5 block text-[10px] text-text-muted-warm sm:mt-1 sm:text-xs">
            <span className="hidden min-[380px]:inline">registration</span>
            <span className="min-[380px]:hidden">reg</span>
            {item.registrationCount === 1 ? "" : "s"}
          </span>
        </span>
        <ArrowRight
          className="size-3.5 shrink-0 text-text-muted-warm opacity-60 sm:size-4 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 motion-safe:sm:group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}
