"use client";

import Link from "next/link";
import { Check, Circle, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  countCompletedOnboardingSteps,
  dismissDashboardOnboarding,
  type DashboardOnboardingItem,
} from "@/lib/dashboard-onboarding";
import { cn } from "@/lib/utils";

type DashboardOnboardingChecklistProps = {
  items: DashboardOnboardingItem[];
  onDismiss?: () => void;
};

export function DashboardOnboardingChecklist({
  items,
  onDismiss,
}: DashboardOnboardingChecklistProps) {
  const { completed, total } = countCompletedOnboardingSteps(items);
  const allDone = completed === total;

  function handleDismiss() {
    dismissDashboardOnboarding();
    onDismiss?.();
  }

  return (
    <section className="rounded-xl border border-border-warm bg-gradient-to-br from-card to-surface-warm/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-section text-text-warm">Getting started</h3>
          <p className="mt-1 text-sm text-text-muted-warm">
            Complete these steps to launch your first lead engine.
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-text-muted-warm"
            onClick={handleDismiss}
          >
            <X className="size-4" aria-hidden />
            {allDone ? "Dismiss" : "Hide for now"}
          </Button>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            {item.done ? (
              <div
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left",
                  "border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                )}
              >
                <span
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"
                  aria-hidden
                >
                  <Check className="size-3" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-text-warm">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-text-muted-warm">{item.detail}</span>
                </span>
              </div>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-auto w-full items-start justify-start gap-3 px-3 py-2.5 text-left font-normal"
                )}
              >
                <span
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border-warm bg-background text-text-muted-warm"
                  aria-hidden
                >
                  <Circle className="size-3" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-text-warm">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-text-muted-warm">{item.detail}</span>
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
