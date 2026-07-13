"use client";

import { Check, Circle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SetupChecklistItem } from "@/lib/site-builder-utils";
import { countCompletedChecklistItems } from "@/lib/site-builder-utils";
import { cn } from "@/lib/utils";

type WebsiteSetupChecklistProps = {
  items: SetupChecklistItem[];
  onItemAction?: (item: SetupChecklistItem) => void;
  onDismiss?: () => void;
};

export function WebsiteSetupChecklist({
  items,
  onItemAction,
  onDismiss,
}: WebsiteSetupChecklistProps) {
  const { completed, total } = countCompletedChecklistItems(items);
  const allDone = completed === total;

  return (
    <section className="rounded-xl border border-border-warm bg-gradient-to-br from-card to-surface-warm/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-section text-text-warm">Get your site ready</h3>
          <p className="mt-1 text-sm text-text-muted-warm">
            Complete these steps before you publish your homepage.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
              allDone
                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
                : "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
            )}
          >
            {completed} of {total} complete
          </div>
          {onDismiss ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-text-muted-warm"
              onClick={onDismiss}
            >
              <X className="size-4" aria-hidden />
              {allDone ? "Dismiss" : "Hide for now"}
            </Button>
          ) : null}
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((item) => {
          const isActionable = Boolean(onItemAction && !item.done);

          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={!isActionable}
                onClick={() => onItemAction?.(item)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                  item.done
                    ? "border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                    : "border-border-warm bg-background/70",
                  isActionable &&
                    "hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                    item.done
                      ? "bg-emerald-600 text-white"
                      : "border border-border-warm bg-background text-text-muted-warm"
                  )}
                  aria-hidden
                >
                  {item.done ? (
                    <Check className="size-3" />
                  ) : (
                    <Circle className="size-3" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-text-warm">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-text-muted-warm">
                    {item.detail}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
