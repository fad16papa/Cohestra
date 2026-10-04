"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { UpgradePanel } from "@/components/shell/upgrade-panel";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import {
  ensureDefaultReportSearchParams,
  ReportFilterBar,
} from "@/components/reports/report-filter-bar";
import { ReportResults } from "@/components/reports/report-results";
import { PageHeader } from "@/components/shared/page-header";
import { ProductErrorState } from "@/components/shared/product-error-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { fetchAllActivities, type Activity } from "@/lib/activities-api";
import {
  downloadReportCsvExport,
  exportDisabledReason,
  exportReportCsv,
  fetchReport,
  filtersFromSearchParams,
  filtersToSearchParams,
  ReportRequestError,
  type ReportResult,
} from "@/lib/reports-api";
import { isBasicPlan } from "@/lib/shell/tenant-shell-api";

function isAdvancedReportFilters(filters: ReturnType<typeof filtersFromSearchParams>): boolean {
  return (
    filters.preset === "custom"
    || filters.preset === "monthly"
    || filters.activityId.trim().length > 0
    || filters.community.trim().length > 0
    || filters.leadStatus.trim().length > 0
    || filters.referralSource.trim().length > 0
  );
}

export function ReportsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authFetch, status } = useAuth();
  const { shell } = useTenantShell();
  const { showToast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [reportFilterKey, setReportFilterKey] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const filters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams]
  );

  const currentFilterKey = useMemo(
    () => filtersToSearchParams(filters).toString(),
    [filters]
  );

  const awaitingCustomDates =
    filters.preset === "custom" &&
    (!filters.from.trim() || !filters.to.trim());

  const reportMatchesFilters =
    reportFilterKey !== null && reportFilterKey === currentFilterKey;

  const isReportStale =
    !awaitingCustomDates &&
    initialized &&
    reportFilterKey !== null &&
    reportFilterKey !== currentFilterKey;

  useEffect(() => {
    const defaultPath = ensureDefaultReportSearchParams(searchParams);
    if (defaultPath) {
      router.replace(defaultPath);
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    void fetchAllActivities(authFetch)
      .then((items) => {
        if (!cancelled) {
          setActivities(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActivities([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, status]);

  useEffect(() => {
    if (status !== "authenticated" || !searchParams.toString()) {
      return;
    }

    if (awaitingCustomDates) {
      return;
    }

    let cancelled = false;
    const filterKey = currentFilterKey;
    if (filterKey !== reportFilterKey) {
      setError(null);
      setErrorStatus(null);
    }

    void fetchReport(authFetch, filters)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setReport(result);
        setReportFilterKey(filterKey);
        setError(null);
        setErrorStatus(null);
        setInitialized(true);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setReportFilterKey(filterKey);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load report."
        );
        setErrorStatus(
          loadError instanceof ReportRequestError ? loadError.status : null
        );
        setInitialized(true);
      });

    return () => {
      cancelled = true;
    };
  }, [
    authFetch,
    awaitingCustomDates,
    currentFilterKey,
    filters,
    reloadNonce,
    searchParams,
    status,
  ]);

  const pageReady =
    initialized ||
    (status === "authenticated" &&
      Boolean(searchParams.toString()) &&
      awaitingCustomDates);

  const disabledExportReason = exportDisabledReason({
    awaitingCustomDates,
    isReportStale,
    error,
    registrations: reportMatchesFilters && report ? report.registrations : null,
    isExporting,
  });
  const canExport = disabledExportReason === null;

  async function handleExportCsv() {
    if (!canExport || !report) {
      return;
    }

    if (report.registrations > 5000) {
      const confirmed = window.confirm(
        `This export includes ${report.registrations.toLocaleString()} registrations and may take a moment. Continue?`
      );
      if (!confirmed) {
        return;
      }
    }

    setIsExporting(true);

    try {
      if (report.registrations > 5000) {
        showToast(`Exporting all ${report.registrations.toLocaleString()} registrations…`);
      }

      const exportResult = await exportReportCsv(authFetch, filters);
      downloadReportCsvExport(exportResult);

      if (exportResult.registrationRowCount > 0) {
        showToast(`Exported ${exportResult.registrationRowCount} registrations.`);
      } else {
        showToast("Report exported.");
      }
    } catch (exportError) {
      showToast(
        exportError instanceof Error
          ? exportError.message
          : "Could not export report."
      );
    } finally {
      setIsExporting(false);
    }
  }

  if (status === "loading" || !searchParams.toString() || !pageReady) {
    return (
      <div className="space-y-2">
        <PageHeader title="Analytics" description="Loading report…" />
      </div>
    );
  }

  if (errorStatus === 403) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" />
        <ProductErrorState
          title="You don’t have access to Analytics"
          message={error ?? "Your role cannot open Analytics."}
          backHref="/dashboard"
          backLabel="Back to Dashboard"
        />
      </div>
    );
  }

  if (shell && isBasicPlan(shell.plan) && isAdvancedReportFilters(filters)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" />
        <p className="text-sm text-text-muted-warm">
          Weekly reporting stays available on Basic.{" "}
          <button
            type="button"
            className="min-h-11 font-medium text-text-link underline underline-offset-2"
            onClick={() => router.replace("/analytics?preset=weekly")}
          >
            Back to weekly Analytics
          </button>
        </p>
        <ReportFilterBar activities={activities} />
        <UpgradePanel
          title="Queryable reports unlock on Core"
          description="Basic includes a simple registration list and CSV export. Compare Core and Pro below for filters, rankings, campaign analytics, and saved views."
          requiredPlan="Core"
          isTenantAdmin={shell.isTenantAdmin}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Understand what happened, why it matters, and export the same numbers your team trusts."
        actions={
          <div className="flex max-w-xs flex-col items-stretch gap-1 sm:items-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={!canExport}
              aria-describedby={disabledExportReason ? "analytics-export-reason" : undefined}
              onClick={() => void handleExportCsv()}
            >
              {isExporting ? "Exporting…" : "Export CSV"}
            </Button>
            {disabledExportReason ? (
              <p id="analytics-export-reason" className="text-xs text-text-muted-warm">
                {disabledExportReason}
              </p>
            ) : null}
          </div>
        }
      />

      <ReportFilterBar activities={activities} />

      {isReportStale ? (
        <p aria-live="polite" className="text-sm text-text-muted-warm">
          Updating report…
        </p>
      ) : null}

      {error ? (
        <ProductErrorState
          title="Could not load Analytics"
          message={error}
          onRetry={() => {
            setInitialized(false);
            setReloadNonce((value) => value + 1);
          }}
        />
      ) : null}

      {!awaitingCustomDates && !error && report && reportMatchesFilters ? (
        <ReportResults report={report} filters={filters} />
      ) : null}
    </div>
  );
}
