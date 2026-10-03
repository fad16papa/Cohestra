"use client";

import { cn } from "@/lib/utils";

type PlanBadgeProps = {
  plan: string | null;
  className?: string;
};

const PLAN_STYLES: Record<string, string> = {
  Basic: "border-border-warm bg-muted/40 text-text-warm",
  Core: "border-lagoon/30 bg-lagoon/10 text-foreground",
  Pro: "border-gold/40 bg-gold/10 text-text-accent",
  Enterprise: "border-primary/30 bg-primary/10 text-text-link",
};

const UNKNOWN_PLAN_STYLE = "border-border-warm bg-muted/40 text-text-warm";

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  if (!plan) {
    return null;
  }

  const style = PLAN_STYLES[plan] ?? UNKNOWN_PLAN_STYLE;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        style,
        className
      )}
      aria-label={`Current plan: ${plan}`}
    >
      {plan}
    </span>
  );
}
