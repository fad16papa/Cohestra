"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ReportDepthCardProps = {
  children: ReactNode;
  className?: string;
  accent?: "lagoon" | "gold" | "neutral";
};

const accentBorder = {
  lagoon: "border-t-lagoon/50",
  gold: "border-t-gold/60",
  neutral: "border-t-border-warm",
} as const;

/** Layered card chrome for report panels — subtle lift without noisy 3D. */
export function ReportDepthCard({
  children,
  className,
  accent = "neutral",
}: ReportDepthCardProps) {
  return (
    <div
      className={cn(
        "report-depth-card rounded-xl border border-border-warm bg-card/95 backdrop-blur-sm",
        "border-t-2 shadow-[0_18px_40px_rgba(7,13,18,0.07)]",
        "transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5",
        "motion-safe:hover:shadow-[0_24px_48px_rgba(7,13,18,0.11)]",
        accentBorder[accent],
        className
      )}
    >
      {children}
    </div>
  );
}

type ReportPanelHeaderProps = {
  title: string;
  description: string;
  aside?: ReactNode;
};

export function ReportPanelHeader({ title, description, aside }: ReportPanelHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-warm/70 px-4 py-3.5 sm:px-5">
      <div className="min-w-0">
        <h3 className="text-section text-text-warm">{title}</h3>
        <p className="mt-1 text-sm text-text-muted-warm">{description}</p>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

type ReportRankBadgeProps = {
  rank: number;
};

const rankStyles = [
  "bg-gold/15 text-gold ring-gold/30",
  "bg-muted/60 text-text-warm ring-border-warm",
  "bg-amber-100/80 text-amber-900 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-100",
] as const;

export function ReportRankBadge({ rank }: ReportRankBadgeProps) {
  const style = rank <= 3 ? rankStyles[rank - 1] : "bg-muted/40 text-text-muted-warm ring-border-warm";

  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums ring-1",
        style
      )}
      aria-hidden
    >
      {rank}
    </span>
  );
}

type ReportShareBarProps = {
  percent: number;
  tone?: "lagoon" | "gold" | "muted";
};

const barTone = {
  lagoon: "from-lagoon/80 to-lagoon/35",
  gold: "from-gold/80 to-gold/35",
  muted: "from-muted-foreground/50 to-muted-foreground/20",
} as const;

export function ReportShareBar({ percent, tone = "lagoon" }: ReportShareBarProps) {
  const width = Math.max(4, Math.min(100, percent));

  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-muted/50"
      role="presentation"
      aria-hidden
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
          barTone[tone]
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function truncateReportLabel(value: string, maxLength = 48): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

export function formatSharePercent(value: number, total: number): string {
  if (total <= 0) {
    return "0%";
  }

  const percent = (value / total) * 100;
  return `${percent >= 10 ? Math.round(percent) : percent.toFixed(1)}%`;
}
