"use client";

import Link from "next/link";
import { AlertCircle, Clock, CreditCard, Lock } from "lucide-react";

import type { BillingBanner } from "@/lib/shell/tenant-shell-api";
import { cn } from "@/lib/utils";

type BillingBannerProps = {
  banner: BillingBanner;
  isTenantAdmin: boolean;
  className?: string;
};

const VARIANT_ICONS = {
  trialing: Clock,
  past_due: CreditCard,
  on_hold: Lock,
  read_only_over_limit: AlertCircle,
} as const;

const VARIANT_STYLES = {
  trialing: "border-lagoon/30 bg-lagoon/5 text-text-warm",
  past_due: "border-gold/40 bg-gold/5 text-text-warm",
  on_hold: "border-destructive/30 bg-destructive/5 text-text-warm",
  read_only_over_limit: "border-destructive/30 bg-destructive/5 text-text-warm",
} as const;

export function BillingBannerBar({ banner, isTenantAdmin, className }: BillingBannerProps) {
  const Icon =
    VARIANT_ICONS[banner.variant as keyof typeof VARIANT_ICONS] ?? AlertCircle;
  const style =
    VARIANT_STYLES[banner.variant as keyof typeof VARIANT_STYLES]
    ?? VARIANT_STYLES.past_due;

  const showCta =
    banner.ctaLabel
    && banner.ctaHref
    && (!banner.adminOnlyCta || isTenantAdmin);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6",
        style,
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-current" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">{banner.title}</p>
          <p className="text-sm text-text-muted-warm">{banner.message}</p>
        </div>
      </div>
      {showCta ? (
        <Link
          href={banner.ctaHref!}
          className="inline-flex shrink-0 items-center justify-center rounded-md border border-current/20 bg-card px-3 py-1.5 text-sm font-medium hover:bg-card/80"
        >
          {banner.ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
