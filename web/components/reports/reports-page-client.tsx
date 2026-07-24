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
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { fetchAllActivities, type Activity } from "@/lib/activities-api";
import {
  downloadReportCsvExport,
  exportReportCsv,
  fetchReport,
  filtersFromSearchParams,
  filtersToSearchParams,
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

    void fetchReport(authFetch, filters)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setReport(result);
        setReportFilterKey(filterKey);
        setError(null);
        setInitialized(true);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load report."
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
    searchParams,
    status,
  ]);

  const pageReady =
    initialized ||
    (status === "authenticated" &&
      Boolean(searchParams.toString()) &&
      awaitingCustomDates);

  const canExport =
    !awaitingCustomDates &&
    !isReportStale &&
    reportMatchesFilters &&
    !error &&
    report !== null &&
    report.registrations > 0 &&
    !isExporting;

  async function handleExportCsv() {
    if (!canExport) {
      return;
    }

    setIsExporting(true);

    try {
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
    return <p className="text-sm text-text-muted-warm">Loading report…</p>;
  }

  if (shell && isBasicPlan(shell.plan) && isAdvancedReportFilters(filters)) {
    return (
      <UpgradePanel
        title="Queryable reports unlock on Core"
        description="Basic includes a simple registration list and CSV export. Compare Core and Pro below for filters, rankings, campaign analytics, and saved views."
        requiredPlan="Core"
        isTenantAdmin={shell.isTenantAdmin}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-display-sm text-text-warm">Reports</h2>
          <p className="mt-1 text-sm text-text-muted-warm">
            Weekly and monthly performance with conjunctive filters.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!canExport}
          onClick={() => void handleExportCsv()}
        >
          {isExporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>

      <ReportFilterBar activities={activities} />

      {isReportStale ? (
        <p className="text-sm text-text-muted-warm">Updating report…</p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!awaitingCustomDates && !error && report && reportMatchesFilters ? (
        <ReportResults report={report} />
      ) : null}
    </div>
  );
}
