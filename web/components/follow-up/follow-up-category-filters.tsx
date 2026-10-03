"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";
import {
  FOLLOW_UP_CATEGORY_OPTIONS,
  followUpCategoryLabel,
  type FollowUpCategory,
  type FollowUpCategoryCounts,
} from "@/lib/follow-up-category";

type FollowUpCategoryFiltersProps = {
  value: FollowUpCategory;
  counts: FollowUpCategoryCounts;
  onChange: (category: FollowUpCategory) => void;
};

export function FollowUpCategoryFilters({
  value,
  counts,
  onChange,
}: FollowUpCategoryFiltersProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  function focusCategory(category: FollowUpCategory) {
    groupRef.current
      ?.querySelector<HTMLElement>(`#follow-up-category-${category}`)
      ?.focus();
  }

  return (
    <div className="min-w-0">
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label="Follow-up category"
        className="flex min-w-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5"
      >
        {FOLLOW_UP_CATEGORY_OPTIONS.map((option, index) => {
          const selected = value === option.value;
          const count = counts[option.value];

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              id={`follow-up-category-${option.value}`}
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
                  return;
                }
                event.preventDefault();
                const delta = event.key === "ArrowRight" ? 1 : -1;
                const next =
                  FOLLOW_UP_CATEGORY_OPTIONS[
                    (index + delta + FOLLOW_UP_CATEGORY_OPTIONS.length) %
                      FOLLOW_UP_CATEGORY_OPTIONS.length
                  ];
                onChange(next.value);
                requestAnimationFrame(() => focusCategory(next.value));
              }}
              onClick={() => onChange(option.value)}
              className={cn(
                "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium motion-local",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-border-warm bg-background text-text-warm shadow-sm"
                  : "border-transparent bg-muted/40 text-text-muted-warm hover:bg-muted/70 hover:text-text-warm"
              )}
            >
              <span className="whitespace-nowrap">{option.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                  selected ? "bg-muted text-text-warm" : "bg-background/80 text-text-muted-warm"
                )}
              >
                <span className="sr-only">
                  {followUpCategoryLabel(option.value)} count
                </span>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
