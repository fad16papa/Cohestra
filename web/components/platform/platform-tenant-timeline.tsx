"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getPlatformTenantTimeline,
  type PlatformTenantTimelineItem,
  type PlatformTenantTimelineResponse,
  type PlatformTenantTimelineType,
} from "@/lib/platform-api";

const TYPE_LABELS: Record<PlatformTenantTimelineType, string> = {
  audit: "Audit",
  support: "Support",
  outbox: "Outbox",
  paddle: "Paddle",
  billing_snapshot: "Current snapshot",
};

const EMPTY_COPY = "No diagnostic timeline events are recorded for this tenant yet.";
const LOADING_COPY = "Loading diagnostic timeline…";
const ERROR_COPY = "Diagnostic timeline unavailable.";

type AuthFetch = (input: string, init?: RequestInit) => Promise<Response>;

type PlatformTenantTimelineProps = {
  tenantId: string;
  authFetch: AuthFetch;
};

export function PlatformTenantTimeline({ tenantId, authFetch }: PlatformTenantTimelineProps) {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [timeline, setTimeline] = useState<PlatformTenantTimelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const next = await getPlatformTenantTimeline(authFetch, tenantId);
      setTimeline(next);
      setPhase("ready");
    } catch (err) {
      setTimeline(null);
      setError(err instanceof Error ? err.message : ERROR_COPY);
      setPhase("error");
    }
  }, [authFetch, tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const paddle = timeline?.sources.find(
    (source) => source.source === "paddle_webhook_deliveries"
  );

  return (
    <section className="space-y-4" aria-labelledby="tenant-timeline-heading">
      <h2
        id="tenant-timeline-heading"
        className="text-lg tracking-tight"
        style={{ fontFamily: "var(--font-plat-display), Georgia, serif" }}
      >
        Timeline
      </h2>
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--plat-stone)]">
        Correlated operational events for this workspace. Recent audit below stays as the
        lifecycle log. Timeline never shows payloads, ticket bodies, or webhook secrets.
      </p>

      {phase === "loading" ? (
        <p role="status" aria-live="polite" className="text-sm text-[var(--plat-stone)]">
          {LOADING_COPY}
        </p>
      ) : null}

      {phase === "error" ? (
        <div role="alert" className="space-y-3">
          <p className="text-sm text-[var(--plat-danger)]">
            {ERROR_COPY} {error}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-11 rounded-[10px] border border-[var(--plat-line-strong)] px-4 text-sm font-semibold text-[var(--plat-ink)]"
          >
            Try again
          </button>
        </div>
      ) : null}

      {phase === "ready" && timeline ? (
        <div className="space-y-4">
          {!timeline.hasHistoricalEvents ? (
            <p className="text-sm text-[var(--plat-stone)]">{EMPTY_COPY}</p>
          ) : null}
          {paddle?.state === "missing_instrumentation" ? (
            <p className="text-sm text-[var(--plat-stone)]">
              Paddle deliveries: missing instrumentation. This is not a billing-health
              statement.
            </p>
          ) : null}
          <ol className="space-y-3">
            {timeline.items.map((item) => (
              <TimelineRow key={item.id} item={item} />
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

function TimelineRow({ item }: { item: PlatformTenantTimelineItem }) {
  return (
    <li className="rounded-[10px] border border-[var(--plat-line)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <time
          dateTime={item.timestamp}
          className="text-xs tabular-nums text-[var(--plat-stone)]"
        >
          {formatDateTime(item.timestamp)}
        </time>
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--plat-ink)]">
          {TYPE_LABELS[item.type]}
        </span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-[var(--plat-ink-soft)] break-words">
        {item.summary}
      </p>
      <p className="mt-1 text-xs text-[var(--plat-stone)] break-words">
        Source: {item.provenance}
      </p>
    </li>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().replace("T", " ").slice(0, 19) + "Z";
}
