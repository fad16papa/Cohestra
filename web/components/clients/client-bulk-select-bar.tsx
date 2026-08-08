"use client";

import Link from "next/link";
import { Megaphone, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ClientBulkSelectBarProps = {
  selectedCount: number;
  consentedCount: number;
  excludedConsentCount: number;
  canUseCampaignHandoff: boolean;
  onClear: () => void;
  onAddToCampaign: () => void;
  className?: string;
};

export function ClientBulkSelectBar({
  selectedCount,
  consentedCount,
  excludedConsentCount,
  canUseCampaignHandoff,
  onClear,
  onAddToCampaign,
  className,
}: ClientBulkSelectBarProps) {
  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-4 z-40 mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-border-warm bg-card/95 px-4 py-3 shadow-lg backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-5",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-warm">
          {selectedCount} selected
          {excludedConsentCount > 0
            ? ` · ${consentedCount} with consent (${excludedConsentCount} excluded)`
            : null}
        </p>
        {!canUseCampaignHandoff ? (
          <p className="mt-0.5 text-xs text-text-muted-warm">
            Upgrade to Pro to add selected clients to a campaign.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          <X className="size-4" aria-hidden />
          Clear
        </Button>
        {canUseCampaignHandoff ? (
          <Button type="button" size="sm" className="gap-1.5" onClick={onAddToCampaign}>
            <Megaphone className="size-4" aria-hidden />
            Add to campaign
          </Button>
        ) : (
          <Link
            href="/settings/billing"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            Upgrade to Pro
          </Link>
        )}
      </div>
    </div>
  );
}
