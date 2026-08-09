"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { ActivitiesAtCapBannerState } from "@/lib/plan-limit-utils";
import { cn } from "@/lib/utils";

const WARN_DISMISS_STORAGE_KEY_PREFIX =
  "cohestra.activities-at-cap-banner-warn-dismissed";

function warnDismissStorageKey(tenantSlug: string): string {
  return `${WARN_DISMISS_STORAGE_KEY_PREFIX}:${tenantSlug}`;
}

type ActivitiesAtCapBannerProps = {
  state: ActivitiesAtCapBannerState;
  showUpgradeLink: boolean;
  tenantSlug: string;
  onReviewPublished: () => void;
  className?: string;
};

export function ActivitiesAtCapBanner({
  state,
  showUpgradeLink,
  tenantSlug,
  onReviewPublished,
  className,
}: ActivitiesAtCapBannerProps) {
  const [warnDismissed, setWarnDismissed] = useState(false);
  const dismissStorageKey = warnDismissStorageKey(tenantSlug);

  useEffect(() => {
    if (state.variant !== "warn") {
      return;
    }

    setWarnDismissed(
      window.sessionStorage.getItem(dismissStorageKey) === "true"
    );
  }, [dismissStorageKey, state.variant]);

  if (state.variant === "warn" && warnDismissed) {
    return null;
  }

  const isBlocked = state.variant === "blocked";

  function dismissWarnBanner() {
    window.sessionStorage.setItem(dismissStorageKey, "true");
    setWarnDismissed(true);
  }

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
      {state.publishedLine ? <p>{state.publishedLine}</p> : null}
      {state.registrationsLine ? (
        <p className={state.publishedLine ? "mt-1 opacity-90" : undefined}>
          {state.registrationsLine}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {state.showReviewPublished ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              isBlocked
                ? "border-destructive/30 bg-background/80 hover:bg-background"
                : "border-gold/40 bg-background/80 hover:bg-background"
            )}
            onClick={onReviewPublished}
          >
            Review published
          </Button>
        ) : null}
        {showUpgradeLink && state.showUpgradeLink ? (
          <Link
            href="/settings/billing"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              isBlocked
                ? "border-destructive/30 bg-background/80 hover:bg-background"
                : "border-gold/40 bg-background/80 hover:bg-background"
            )}
          >
            View billing &amp; upgrade
          </Link>
        ) : null}
        {state.variant === "warn" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-text-muted-warm"
            onClick={dismissWarnBanner}
          >
            Dismiss
          </Button>
        ) : null}
      </div>
    </div>
  );
}
