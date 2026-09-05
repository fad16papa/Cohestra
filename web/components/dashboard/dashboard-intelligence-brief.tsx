"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ListChecks } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { buttonVariants } from "@/components/ui/button";
import {
  fetchIntelligenceBrief,
  type IntelligenceBrief,
  type IntelligenceInsight,
} from "@/lib/intelligence-api";
import { cn } from "@/lib/utils";

function modeLabel(mode: string): string {
  if (mode === "deterministic") {
    return "From your workspace data";
  }

  if (mode === "synthesized") {
    return "Synthesized from your workspace data";
  }

  return "From your workspace data";
}

function InsightCard({ insight }: { insight: IntelligenceInsight }) {
  return (
    <article className="rounded-xl border border-border-warm bg-background/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h3 className="text-base font-medium text-text-warm">{insight.title}</h3>
          <p className="text-sm leading-relaxed text-text-muted-warm">
            {insight.whyItMatters}
          </p>
          {insight.whatChanged ? (
            <p className="text-sm text-text-warm">{insight.whatChanged}</p>
          ) : null}
        </div>
        <Link
          href={insight.recommendedAction.href}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "shrink-0 self-start"
          )}
        >
          {insight.recommendedAction.label}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-primary">
          Why this is true
        </summary>
        <ul className="mt-2 space-y-1.5">
          {insight.evidence.map((item) => (
            <li
              key={`${item.label}-${item.value}`}
              className="flex flex-wrap gap-x-2 text-sm text-text-muted-warm"
            >
              <span>{item.label}</span>
              {item.href ? (
                <Link
                  href={item.href}
                  className="font-medium text-text-warm underline-offset-4 hover:underline"
                >
                  {item.value}
                </Link>
              ) : (
                <span className="font-medium text-text-warm">{item.value}</span>
              )}
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

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
          <ListChecks className="size-4 text-primary" aria-hidden />
          <h2
            id="intelligence-brief-heading"
            className="text-sm font-medium text-text-warm"
          >
            Needs attention
          </h2>
        </div>
        {brief ? (
          <p className="text-xs text-text-muted-warm">{modeLabel(brief.mode)}</p>
        ) : null}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3" aria-busy="true" aria-live="polite">
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
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
          >
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !error && brief?.insufficientData.isInsufficient ? (
        <p className="text-sm leading-relaxed text-text-muted-warm">
          {brief.insufficientData.message ||
            "Nothing needs attention against the grounded rules right now."}
        </p>
      ) : null}

      {!loading && !error && brief && brief.insights.length > 0 ? (
        <div className="space-y-3">
          {brief.insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
