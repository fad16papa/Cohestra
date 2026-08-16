"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/auth-provider";
import { PlatformCard } from "@/components/platform/platform-card";
import {
  exportPlatformSupportReportCsv,
  getPlatformSupportReport,
  type PlatformSupportReport,
  type PlatformSupportReportPreset,
} from "@/lib/platform-api";

const presetOptions: Array<{ value: PlatformSupportReportPreset; label: string }> = [
  { value: "weekly", label: "This week" },
  { value: "monthly", label: "This month" },
  { value: "custom", label: "Custom range" },
];

export default function PlatformSupportReportPage() {
  const { authFetch } = useAuth();
  const [preset, setPreset] = useState<PlatformSupportReportPreset>("weekly");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [report, setReport] = useState<PlatformSupportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const customRangeReady =
    preset !== "custom" || (appliedFrom.length > 0 && appliedTo.length > 0);

  useEffect(() => {
    if (!customRangeReady) {
      setLoading(false);
      setReport(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void getPlatformSupportReport(authFetch, {
      preset,
      from: preset === "custom" ? appliedFrom : undefined,
      to: preset === "custom" ? appliedTo : undefined,
    })
      .then((result) => {
        if (cancelled) {
          return;
        }
        setReport(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load support report.");
        setReport(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, appliedFrom, appliedTo, customRangeReady, preset]);

  function handlePresetChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextPreset = event.target.value as PlatformSupportReportPreset;
    setPreset(nextPreset);
    if (nextPreset !== "custom") {
      setDraftFrom("");
      setDraftTo("");
      setAppliedFrom("");
      setAppliedTo("");
    }
  }

  function handleCustomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftFrom || !draftTo) {
      setError("Choose both from and to dates.");
      return;
    }
    if (draftFrom > draftTo) {
      setError("From date must be on or before to date.");
      return;
    }
    setError(null);
    setAppliedFrom(draftFrom);
    setAppliedTo(draftTo);
  }

  async function handleExport() {
    if (!customRangeReady) {
      setError("Choose a from and to date, then click Apply.");
      return;
    }

    setExporting(true);
    setError(null);
    try {
      const result = await exportPlatformSupportReportCsv(authFetch, {
        preset,
        from: preset === "custom" ? appliedFrom : undefined,
        to: preset === "custom" ? appliedTo : undefined,
      });
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export CSV.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/platform/support"
            className="text-sm text-[var(--plat-lagoon)] underline-offset-4 hover:underline"
          >
            ← Back to inbox
          </Link>
          <h1
            className="mt-4 text-3xl tracking-tight text-[var(--plat-ink)]"
            style={{ fontFamily: "var(--font-plat-display), Georgia, serif" }}
          >
            Support volume
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--plat-stone)]">
            See whether issues are piling up and export issue rows for the selected period.
          </p>
        </div>
        <button
          type="button"
          disabled={exporting || loading || !customRangeReady}
          onClick={() => void handleExport()}
          className="min-h-11 rounded-[10px] border border-[var(--plat-line-strong)] px-4 text-sm font-semibold text-[var(--plat-ink)] transition-colors hover:bg-white disabled:opacity-50"
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label htmlFor="support-report-preset" className="text-sm text-[var(--plat-stone)]">
            Period
          </label>
          <select
            id="support-report-preset"
            value={preset}
            onChange={handlePresetChange}
            className="mt-1 min-h-11 rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 text-sm outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
          >
            {presetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {preset === "custom" ? (
          <form onSubmit={handleCustomSubmit} className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label htmlFor="support-report-from" className="text-sm text-[var(--plat-stone)]">
                From
              </label>
              <input
                id="support-report-from"
                type="date"
                value={draftFrom}
                onChange={(event) => setDraftFrom(event.target.value)}
                className="mt-1 min-h-11 rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 text-sm outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
              />
            </div>
            <div>
              <label htmlFor="support-report-to" className="text-sm text-[var(--plat-stone)]">
                To
              </label>
              <input
                id="support-report-to"
                type="date"
                value={draftTo}
                onChange={(event) => setDraftTo(event.target.value)}
                className="mt-1 min-h-11 rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 text-sm outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
              />
            </div>
            <button
              type="submit"
              className="min-h-11 rounded-[10px] bg-[var(--plat-lagoon)] px-5 text-sm font-semibold text-[var(--plat-lagoon-fg)] transition-colors hover:bg-[#08554F]"
            >
              Apply
            </button>
          </form>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-[var(--plat-danger)]">
          {error}
        </p>
      ) : null}

      {!customRangeReady ? (
        <p className="text-sm text-[var(--plat-stone)]">
          Choose a from and to date, then click Apply.
        </p>
      ) : loading ? (
        <p className="text-sm text-[var(--plat-stone)]">Loading report…</p>
      ) : report ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Opened in period" value={report.openedInPeriod} />
            <MetricCard label="Resolved / closed" value={report.resolvedOrClosedInPeriod} />
            <MetricCard label="Still open" value={report.stillOpen} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <PlatformCard className="p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]">
                Counts by status
              </h2>
              {report.countsByStatus.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--plat-stone)]">No issues yet.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {report.countsByStatus.map((item) => (
                    <li key={item.status} className="flex justify-between gap-4">
                      <span className="text-[var(--plat-ink-soft)]">
                        {formatStatusLabel(item.status)}
                      </span>
                      <span className="tabular-nums font-semibold">{item.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </PlatformCard>

            <PlatformCard className="p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]">
                Top tenants
              </h2>
              {report.topTenants.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--plat-stone)]">No issues opened in this period.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {report.topTenants.map((item) => (
                    <li key={item.tenantSlug} className="flex justify-between gap-4">
                      <span className="text-[var(--plat-ink-soft)]">
                        {item.tenantSlug}
                        <span className="block text-xs text-[var(--plat-stone)]">{item.tenantName}</span>
                      </span>
                      <span className="tabular-nums font-semibold">{item.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </PlatformCard>
          </div>

          <PlatformCard className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]">
              Daily opened trend
            </h2>
            {report.dailyOpenedTrend.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--plat-stone)]">No issues opened in this period.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {report.dailyOpenedTrend.map((item) => (
                  <li key={item.date} className="flex justify-between gap-4">
                    <span className="tabular-nums text-[var(--plat-ink-soft)]">{item.date}</span>
                    <span className="tabular-nums font-semibold">{item.openedCount}</span>
                  </li>
                ))}
              </ul>
            )}
          </PlatformCard>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <PlatformCard className="p-5">
      <p className="text-sm text-[var(--plat-stone)]">{label}</p>
      <p className="mt-2 text-3xl tabular-nums tracking-tight text-[var(--plat-ink)]">{value}</p>
    </PlatformCard>
  );
}

function formatStatusLabel(status: string): string {
  return status.replace(/([a-z])([A-Z])/g, "$1 $2");
}
