"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { IntelligenceInsightCard } from "@/components/intelligence/intelligence-insight-card";
import { PageHeader } from "@/components/shared/page-header";
import { ProductErrorState } from "@/components/shared/product-error-state";
import { Button } from "@/components/ui/button";
import { DASHBOARD_PATH } from "@/lib/admin-canonical-routes";
import {
  fetchIntelligenceBrief,
  intelligenceGeneratedLabel,
  intelligenceModeLabel,
  IntelligenceRequestError,
  presentIntelligenceMode,
  type IntelligenceBrief,
} from "@/lib/intelligence-api";

export function CohestraAiPageClient() {
  const { authFetch, status } = useAuth();
  const [brief, setBrief] = useState<IntelligenceBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);
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
        setErrorStatus(null);
        setLoading(false);
      })
      .catch((loadError: unknown) => {
        if (cancelled) {
          return;
        }

        setBrief(null);
        setErrorStatus(
          loadError instanceof IntelligenceRequestError ? loadError.status : null
        );
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load Cohestra AI."
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, reloadToken, status]);

  if (status === "loading" || (status === "authenticated" && loading && !brief && !error)) {
    return (
      <div className="space-y-2">
        <PageHeader title="Cohestra AI" description="Loading Cohestra AI…" />
        <div role="status" aria-live="polite" aria-busy="true">
          <p className="sr-only">Loading Cohestra AI…</p>
          <div className="mt-4 h-32 rounded-2xl bg-muted motion-safe:animate-pulse" />
        </div>
      </div>
    );
  }

  if (errorStatus === 403) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cohestra AI" />
        <ProductErrorState
          title="You don’t have access to Cohestra AI"
          message={error ?? "Your role cannot open Cohestra AI."}
          backHref={DASHBOARD_PATH}
          backLabel="Back to Dashboard"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cohestra AI" />
        <ProductErrorState
          title="Cohestra AI could not load"
          message={error}
          onRetry={retry}
          backHref={DASHBOARD_PATH}
          backLabel="Back to Dashboard"
        />
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cohestra AI" />
        <ProductErrorState
          title="Cohestra AI could not load"
          message="The brief was empty after a successful load."
          onRetry={retry}
          backHref={DASHBOARD_PATH}
          backLabel="Back to Dashboard"
        />
      </div>
    );
  }

  const presentedMode = presentIntelligenceMode(brief.mode);
  const insufficient = brief.insufficientData.isInsufficient;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cohestra AI"
        description={
          <div className="space-y-1">
            <p>{intelligenceModeLabel(brief.mode)}</p>
            <p>{intelligenceGeneratedLabel(brief)}</p>
          </div>
        }
        actions={
          <Button type="button" variant="outline" onClick={retry} className="min-h-11">
            Refresh brief
          </Button>
        }
      />

      <p className="sr-only" data-testid="intelligence-mode">
        {presentedMode}
      </p>

      {insufficient ? (
        <section
          aria-labelledby="insufficient-data-heading"
          className="rounded-2xl border border-border-warm bg-card/80 p-5"
        >
          <h2 id="insufficient-data-heading" className="text-section text-text-warm">
            Not enough operational data yet
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-muted-warm">
            {brief.insufficientData.message ||
              "Not enough operational data yet. Publish an activity or record a registration, then the brief can name what needs attention."}
          </p>
          <p className="mt-3 text-sm text-text-muted-warm">
            This is not an empty success. Nothing is claimed to need attention until
            grounded rules have facts to name.
          </p>
          <a
            href={DASHBOARD_PATH}
            className="mt-4 inline-flex min-h-11 items-center font-medium text-text-link underline-offset-4 hover:underline"
          >
            Review Dashboard
          </a>
        </section>
      ) : null}

      {!insufficient && brief.insights.length > 0 ? (
        <div className="space-y-3">
          {brief.insights.map((insight) => (
            <IntelligenceInsightCard key={insight.id} insight={insight} headingLevel="h2" />
          ))}
        </div>
      ) : null}

      {!insufficient && brief.insights.length === 0 ? (
        <ProductErrorState
          title="The brief is incomplete"
          message="The payload did not include insights and did not mark insufficient data."
          onRetry={retry}
        />
      ) : null}
    </div>
  );
}
