"use client";

import { cn } from "@/lib/utils";

type PlanBadgeProps = {
  plan: string;
  className?: string;
};

const PLAN_STYLES: Record<string, string> = {
  Basic: "border-border-warm bg-muted/40 text-text-warm",
  Core: "border-lagoon/30 bg-lagoon/10 text-lagoon",
  Pro: "border-gold/40 bg-gold/10 text-gold",
  Enterprise: "border-primary/30 bg-primary/10 text-primary",
};

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const style = PLAN_STYLES[plan] ?? PLAN_STYLES.Basic;

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
