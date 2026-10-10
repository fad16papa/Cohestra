"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  getPlatformOpsVersion,
  type PlatformOpsVersion,
} from "@/lib/platform-api";
import { freshnessLabel, observedLabel } from "@/lib/platform-overview";

export function PlatformOpsVersionSection({ headingId = "ops-version-heading" }: { headingId?: string }) {
  const { authFetch } = useAuth();
  const [version, setVersion] = useState<PlatformOpsVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const load = useCallback(() => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    setVersion(null);
    void getPlatformOpsVersion(authFetch)
      .then((result) => {
        if (seq !== requestSeq.current) {
          return;
        }
        setVersion(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (seq !== requestSeq.current) {
          return;
        }
        setVersion(null);
        setError(
          err instanceof Error
            ? `${err.message} Refresh version or try again.`
            : "Version data unavailable. Refresh the page or try again."
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
    <section className="space-y-3" aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]"
      >
        Version
      </h2>
      {loading ? (
        <p role="status" aria-live="polite" className="text-sm text-[var(--plat-stone)]">
          Loading version…
        </p>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-[10px] border border-[var(--plat-danger)]/30 bg-[var(--plat-danger-bg)] px-4 py-5"
        >
          <h3 className="text-base font-semibold text-[var(--plat-danger)]">Version data unavailable</h3>
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
      {version && !loading && !error ? <VersionDetails version={version} /> : null}
    </section>
  );
}

function VersionDetails({ version }: { version: PlatformOpsVersion }) {
  const sha = version.gitSha;
  const shortSha = sha.value ? sha.value.slice(0, 12) : null;
  return (
    <div className="space-y-3 rounded-[10px] border border-[var(--plat-line)] bg-white/70 p-4 sm:p-5">
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-[var(--plat-stone)]">Git SHA</dt>
          <dd className="mt-1 min-w-0 break-all text-[var(--plat-ink)]">
            {sha.freshness === "actual" && sha.value ? (
              <>
                <span title={sha.value}>{shortSha}</span>
                <span className="mt-1 block min-w-0 break-all font-mono text-xs text-[var(--plat-stone)]">
                  {sha.value}
                </span>
              </>
            ) : sha.freshness === "missing_instrumentation" ? (
              <>
                <span>Missing instrumentation</span>
                <span className="mt-1 block min-w-0 break-words text-xs leading-relaxed text-[var(--plat-stone)]">
                  The deployed commit is not currently instrumented. This is not a health status
                  and is not a substitute build id.
                </span>
              </>
            ) : (
              <span>Unavailable</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--plat-stone)]">Environment</dt>
          <dd className="mt-1 min-w-0 break-words text-[var(--plat-ink)]">{version.environmentName.value}</dd>
        </div>
        <div>
          <dt className="text-[var(--plat-stone)]">API version</dt>
          <dd className="mt-1 text-[var(--plat-ink)]">{version.apiVersion.value}</dd>
        </div>
      </dl>
      <p className="min-w-0 break-words text-xs leading-relaxed text-[var(--plat-stone)]">
        <span className="font-medium text-[var(--plat-ink)]">{freshnessLabel(sha.freshness)}</span>
        <span aria-hidden> · </span>
        <span>{sha.source}</span>
        <span aria-hidden> · </span>
        <time dateTime={sha.observedAt}>{observedLabel(sha.observedAt)}</time>
      </p>
    </div>
  );
}
