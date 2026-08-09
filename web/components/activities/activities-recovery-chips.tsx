"use client";

import { forwardRef } from "react";

import { cn } from "@/lib/utils";

type RecoveryFilterChip = {
  id: string;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
};

function RecoveryFilterChipButton({ chip }: { chip: RecoveryFilterChip }) {
  return (
    <button
      type="button"
      id={chip.id}
      aria-pressed={chip.active}
      onClick={chip.onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
        chip.active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border-warm bg-background text-text-muted-warm hover:border-primary/30 hover:text-text-warm"
      )}
    >
      <span className="whitespace-nowrap">{chip.label}</span>
      {typeof chip.count === "number" ? (
        <span
          className={cn(
            "inline-flex min-w-[1.375rem] justify-center rounded-full px-1.5 py-0.5 text-xs tabular-nums leading-none",
            chip.active ? "bg-primary/15" : "bg-muted/70"
          )}
        >
          {chip.count}
        </span>
      ) : null}
    </button>
  );
}

type ActivitiesRecoveryChipsProps = {
  publishedCount: number;
  publishedFilterActive: boolean;
  showPublishedOnlyChip: boolean;
  showFreeASlotChip: boolean;
  recoveryMode: boolean;
  onPublishedOnlyClick: () => void;
  onFreeASlotClick: () => void;
  className?: string;
};

export const ActivitiesRecoveryChips = forwardRef<
  HTMLDivElement,
  ActivitiesRecoveryChipsProps
>(function ActivitiesRecoveryChips(
  {
    publishedCount,
    publishedFilterActive,
    showPublishedOnlyChip,
    showFreeASlotChip,
    recoveryMode,
    onPublishedOnlyClick,
    onFreeASlotClick,
    className,
  },
  ref
) {
  if (!showPublishedOnlyChip && !showFreeASlotChip) {
    return null;
  }

  return (
    <div ref={ref} className={cn("space-y-3", className)}>
      <div
        aria-label="Activity recovery filters"
        className="flex flex-wrap items-center gap-2"
      >
        {showPublishedOnlyChip ? (
          <RecoveryFilterChipButton
            chip={{
              id: "published-only-chip",
              label: "Published only",
              count: publishedCount,
              active: publishedFilterActive,
              onClick: onPublishedOnlyClick,
            }}
          />
        ) : null}
        {showFreeASlotChip ? (
          <RecoveryFilterChipButton
            chip={{
              id: "free-a-slot-chip",
              label: "Free a slot",
              active: recoveryMode,
              onClick: onFreeASlotClick,
            }}
          />
        ) : null}
      </div>

      {recoveryMode ? (
        <p
          role="status"
          className="rounded-lg border border-lagoon/30 border-l-lagoon bg-lagoon/5 px-3 py-2 text-sm text-text-warm"
        >
          You&apos;re at your published limit. Open an activity below and{" "}
          <strong>archive</strong> or <strong>unpublish</strong> it to free a
          slot.
        </p>
      ) : null}
    </div>
  );
});
