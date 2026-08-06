import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

export type MetricTileDelta = {
  /** Signed percent change vs the previous period (e.g. 12.5, -8). */
  percent: number | null;
  /** Comparison caption, e.g. "vs previous 7 days". */
  label: string;
};

type MetricTileProps = {
  label: string;
  value: string;
  href: string;
  ariaLabel: string;
  hint?: string;
  delta?: MetricTileDelta;
  animationDelayMs?: number;
  isRefreshing?: boolean;
};

function formatDeltaPercent(percent: number): string {
  const rounded = Math.abs(percent) >= 10 ? Math.round(Math.abs(percent)) : Math.abs(percent).toFixed(1);
  return `${percent > 0 ? "+" : percent < 0 ? "−" : ""}${rounded}%`;
}

function DeltaChip({ delta }: { delta: MetricTileDelta }) {
  if (delta.percent === null) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-text-muted-warm"
        title={delta.label}
      >
        <Minus className="size-3" aria-hidden />
        n/a
      </span>
    );
  }

  const isUp = delta.percent > 0;
  const isDown = delta.percent < 0;
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        isUp && "bg-status-active/10 text-status-active",
        isDown && "bg-destructive/10 text-destructive",
        !isUp && !isDown && "bg-muted/60 text-text-muted-warm"
      )}
      title={delta.label}
    >
      <Icon className="size-3" aria-hidden />
      {formatDeltaPercent(delta.percent)}
    </span>
  );
}

export function MetricTile({
  label,
  value,
  href,
  ariaLabel,
  hint = "View details",
  delta,
  animationDelayMs = 0,
  isRefreshing = false,
}: MetricTileProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      style={{ animationDelay: `${animationDelayMs}ms` }}
      className={cn(
        "animate-fade-in-up group block rounded-xl border border-border-warm bg-card/90 px-5 py-6 backdrop-blur-sm transition-all",
        "border-t-2 border-t-primary/30 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isRefreshing && "motion-safe:animate-pulse"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-display-sm text-text-warm transition-colors group-hover:text-primary">
          {value}
        </p>
        {delta ? <DeltaChip delta={delta} /> : null}
      </div>
      <p className="mt-2 text-sm font-medium text-text-warm">{label}</p>
      <p className="mt-1 text-xs text-text-muted-warm">{delta ? delta.label : hint}</p>
    </Link>
  );
}
