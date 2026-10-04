"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ListChecks } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { IntelligenceInsightCard } from "@/components/intelligence/intelligence-insight-card";
import { buttonVariants } from "@/components/ui/button";
import { AI_PATH } from "@/lib/admin-canonical-routes";
import {
  fetchIntelligenceBrief,
  intelligenceModeLabel,
  type IntelligenceBrief,
} from "@/lib/intelligence-api";
import { cn } from "@/lib/utils";

export function DashboardIntelligenceBrief() {
  const { authFetch, status } = useAuth();
  const [brief, setBrief] = useState<IntelligenceBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    void fetchIntelligenceBrief(authFetch)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setBrief(result);
        setError(null);
        setLoading(false);
      })
      .catch((loadError: unknown) => {
        if (cancelled) {
          return;
        }

        setBrief(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load what needs attention."
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, reloadToken, status]);

  if (status === "loading") {
    return null;
  }

  return (
    <section
      aria-labelledby="intelligence-brief-heading"
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/80 to-card/80 p-4 shadow-sm backdrop-blur-sm sm:p-5"
    >
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="size-4 text-text-link" aria-hidden />
          <h2
            id="intelligence-brief-heading"
            className="text-sm font-medium text-text-warm"
          >
            Needs attention
          </h2>
        </div>
        <Link
          href={AI_PATH}
          className="min-h-11 text-sm font-medium text-text-link underline-offset-4 hover:underline"
        >
          Open Cohestra AI
        </Link>
        {brief ? (
          <p className="text-xs text-text-muted-warm">{intelligenceModeLabel(brief.mode)}</p>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-3 motion-safe:animate-pulse" aria-busy="true" aria-live="polite">
          <div className="h-16 rounded-xl bg-muted/70" />
          <div className="h-16 rounded-xl bg-muted/50" />
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-background/70 p-4"
        >
          <p className="text-sm text-text-warm">{error}</p>
          <button
            type="button"
            onClick={retry}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 min-h-11")}
          >
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !error && brief?.insufficientData.isInsufficient ? (
        <p className="text-sm leading-relaxed text-text-muted-warm">
          {brief.insufficientData.message ||
            "Not enough operational data yet. Open Cohestra AI for the next manual step."}
        </p>
      ) : null}

      {!loading && !error && brief && brief.insights.length > 0 ? (
        <div className="space-y-3">
          {brief.insights.map((insight) => (
            <IntelligenceInsightCard
              key={insight.id}
              insight={insight}
              headingLevel="h3"
              compact
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
