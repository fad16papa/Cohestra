import Link from "next/link";

import { cn } from "@/lib/utils";

type MetricTileProps = {
  label: string;
  value: string;
  href: string;
  ariaLabel: string;
  hint?: string;
  animationDelayMs?: number;
  isRefreshing?: boolean;
};

export function MetricTile({
  label,
  value,
  href,
  ariaLabel,
  hint = "View details",
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
      <p className="text-display-sm text-text-warm transition-colors group-hover:text-primary">
        {value}
      </p>
      <p className="mt-2 text-sm font-medium text-text-warm">{label}</p>
      <p className="mt-1 text-xs text-text-muted-warm">{hint}</p>
    </Link>
  );
}
