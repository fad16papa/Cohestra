"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { LimitDial } from "@/lib/shell/tenant-shell-api";
import { formatLimitDialCapacityMessage } from "@/lib/plan-limit-utils";
import { cn } from "@/lib/utils";

type PlanLimitAlertProps = {
  message?: string;
  dial?: LimitDial;
  variant?: "blocked" | "warn";
  className?: string;
  showUpgradeLink?: boolean;
};

export function PlanLimitAlert({
  message,
  dial,
  variant = "blocked",
  className,
  showUpgradeLink = true,
}: PlanLimitAlertProps) {
  const copy =
    message ??
    (dial
      ? variant === "warn" && !dial.blocked
        ? `${dial.label} is at ${dial.percent}% of your plan limit (${dial.used}/${dial.limit}). Upgrade before you hit capacity.`
        : formatLimitDialCapacityMessage(dial)
      : null);

  if (!copy) {
    return null;
  }

  const isBlocked = variant === "blocked" || dial?.blocked;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        isBlocked
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-gold/40 bg-gold/10 text-text-warm",
        className
      )}
    >
      <p>{copy}</p>
      {showUpgradeLink && (isBlocked || variant === "warn") ? (
        <Link
          href="/settings/billing"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "mt-3 bg-background/80 hover:bg-background",
            isBlocked
              ? "border-destructive/30"
              : "border-gold/40"
          )}
        >
          View billing &amp; upgrade
        </Link>
      ) : null}
    </div>
  );
}
