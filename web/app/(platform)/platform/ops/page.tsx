"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { PlatformOpsOutboxSection } from "@/components/platform/platform-ops-outbox";
import { getPlatformOpsHealth, type PlatformOpsHealth } from "@/lib/platform-api";
import {
  formatDurationMs,
  healthStatusLabel,
  stackHealthSummary,
} from "@/lib/platform-health";
import { observedLabel } from "@/lib/platform-overview";

export default function PlatformOperationsPage() {
  const { authFetch } = useAuth();
  const [health, setHealth] = useState<PlatformOpsHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const load = useCallback(() => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    setHealth(null);

    void getPlatformOpsHealth(authFetch)
      .then((result) => {
        if (seq !== requestSeq.current) {
          return;
        }
        setHealth(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (seq !== requestSeq.current) {
          return;
        }
        setHealth(null);
        setError(
          err instanceof Error
            ? `${err.message} Refresh Operations or try again.`
            : "Could not load infrastructure health. Refresh the page or try again."
        );
        setLoading(false);
      });
  }, [authFetch]);

  useEffect(() => {
    load();
    return () => {
      requestSeq.current += 1;
    };
  }, [load]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--plat-stone)]">
          Platform
        </p>
        <h1
          className="text-3xl tracking-tight text-[var(--plat-ink)] sm:text-4xl"
          style={{ fontFamily: "var(--font-plat-display), Georgia, serif" }}
        >
          Operations
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--plat-stone)]">
          Authenticated postgres, redis, and default-tenant health. This is not anonymous{" "}
          <code className="font-mono text-[0.95em]">/ready</code>. Health does not measure outbox,
          Paddle, email, or hosted jobs. Outbox counts below are queue metadata, not delivery health.
        </p>
      </header>

      <section className="space-y-3" aria-labelledby="ops-health-heading">
        <h2
          id="ops-health-heading"
          className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]"
        >
          Health
        </h2>

        {loading ? (
          <p role="status" aria-live="polite" className="text-sm text-[var(--plat-stone)]">
            Loading health…
          </p>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="rounded-[10px] border border-[var(--plat-danger)]/30 bg-[var(--plat-danger-bg)] px-4 py-5"
          >
            <h3 className="text-base font-semibold text-[var(--plat-danger)]">
              Health data unavailable
            </h3>
            <p className="mt-2 text-sm text-[var(--plat-ink)]">{error}</p>
            <button
              type="button"
              onClick={() => load()}
              className="mt-4 inline-flex min-h-11 items-center rounded-[10px] bg-[var(--plat-ink)] px-4 text-sm font-semibold text-[var(--plat-paper)]"
            >
              Try again
            </button>
          </div>
        ) : null}

        {health && !loading && !error ? (
          <div className="space-y-4 rounded-[10px] border border-[var(--plat-line)] bg-white/70 p-4 sm:p-5">
            <p className="text-sm text-[var(--plat-ink)]">
              <span className="font-semibold">Overall status: {healthStatusLabel(health.overallStatus)}</span>
              <span className="mt-1 block min-w-0 break-words text-sm leading-relaxed text-[var(--plat-stone)]">
                {stackHealthSummary(health)}
              </span>
            </p>
            <p className="min-w-0 break-words text-xs text-[var(--plat-stone)]">
              <time dateTime={health.observedAt}>{observedLabel(health.observedAt)}</time>
            </p>
            <ul className="space-y-3">
              {health.checks.map((check) => (
                <li
                  key={check.name}
                  className="rounded-[10px] border border-[var(--plat-line)] px-3 py-3"
                >
                  <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 break-words font-semibold text-[var(--plat-ink)]">
                      {check.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-[var(--plat-ink)]">
                      Status: {healthStatusLabel(check.status)}
                      <span aria-hidden> · </span>
                      {formatDurationMs(check.durationMs)}
                    </span>
                  </p>
                  {check.description ? (
                    <p className="mt-1 min-w-0 break-words text-sm text-[var(--plat-stone)]">
                      {check.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <div>
              <h3 className="text-sm font-semibold text-[var(--plat-ink)]">Not measured here</h3>
              <ul className="mt-2 space-y-2">
                {health.notInProbe.map((check) => (
                  <li key={check.name} className="min-w-0 break-words text-sm text-[var(--plat-ink)]">
                    <span className="font-medium">{check.name}</span>
                    <span aria-hidden> — </span>
                    <span>{healthStatusLabel(check.status)}</span>
                    {check.description ? (
                      <span className="block text-[var(--plat-stone)]">{check.description}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </section>

      <section
        className="space-y-2 rounded-[10px] border border-[var(--plat-line)] bg-white/70 p-4 sm:p-5"
        aria-labelledby="ops-billing-heading"
      >
        <h2
          id="ops-billing-heading"
          className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]"
        >
          Billing / Paddle
        </h2>
        <p className="text-sm font-medium text-[var(--plat-ink)]">Missing instrumentation</p>
        <p className="min-w-0 break-words text-sm leading-relaxed text-[var(--plat-stone)]">
          Paddle webhook diagnostics are not measured on this page. This is not a healthy, failed,
          or unavailable billing status.
        </p>
      </section>

      <PlatformOpsOutboxSection />
    </div>
  );
}
