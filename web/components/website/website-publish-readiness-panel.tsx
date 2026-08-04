"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

import { WebsitePublishGateSummary } from "@/components/website/website-section-fields";
import type { PublishGateResult } from "@/lib/site-draft-utils";
import { cn } from "@/lib/utils";

type WebsitePublishReadinessPanelProps = {
  gate: PublishGateResult;
  className?: string;
};

export function WebsitePublishReadinessPanel({
  gate,
  className,
}: WebsitePublishReadinessPanelProps) {
  const hasIssues = gate.blockers.length > 0 || gate.warnings.length > 0;
  const hasBlockers = gate.blockers.length > 0;

  return (
    <section
      id="website-publish-readiness"
      className={cn(
        "rounded-lg border px-3 py-2.5 sm:px-4 sm:py-3",
        hasBlockers
          ? "border-destructive/40 bg-destructive/5"
          : hasIssues
            ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
            : "border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20",
        className
      )}
    >
      <div className="flex items-start gap-2">
        {hasBlockers ? (
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        ) : hasIssues ? (
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        ) : (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-sm font-semibold text-text-warm">Publish readiness</h3>
          {hasIssues ? (
            <>
              <p className="text-xs text-text-muted-warm">
                {hasBlockers
                  ? "Fix these before you can publish."
                  : "Optional improvements before you publish."}
              </p>
              <WebsitePublishGateSummary gate={gate} />
            </>
          ) : (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Your draft meets publish requirements.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
