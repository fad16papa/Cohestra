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
        "rounded-lg border px-3 py-2 sm:px-4",
        hasBlockers
          ? "border-destructive/40 bg-destructive/5"
          : hasIssues
            ? "border-warn/30 bg-surface-warning"
            : "border-success/30 bg-surface-success",
        className
      )}
    >
      <div className="flex items-start gap-2">
        {hasBlockers ? (
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        ) : hasIssues ? (
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-text-warning" aria-hidden />
        ) : (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-text-success" aria-hidden />
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
            <p className="text-sm text-foreground">
              Your draft meets publish requirements.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
