"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-provider";
import type { Activity } from "@/lib/activities-api";
import { fetchCommunities } from "@/lib/communities-api";
import {
  leadStatusLabels,
  leadStatusOptions,
  type LeadStatus,
} from "@/lib/clients-api";
import {
  defaultReportFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
  type ReportFilters,
  type ReportPreset,
} from "@/lib/reports-api";
import { cn } from "@/lib/utils";

type ReportFilterBarProps = {
  activities: Activity[];
};

type ActiveChip = {
  key: keyof ReportFilters | "from" | "to";
  label: string;
};

const presetOptions: Array<{ value: ReportPreset; label: string }> = [
  { value: "weekly", label: "This week" },
  { value: "monthly", label: "This month" },
  { value: "custom", label: "Custom range" },
];

const REFERRAL_SOURCE_DEBOUNCE_MS = 400;

type ReferralSourceFilterProps = {
  committedValue: string;
  getFilters: () => ReportFilters;
  onApply: (filters: ReportFilters) => void;
};

function ReferralSourceFilter({
  committedValue,
  getFilters,
  onApply,
}: ReferralSourceFilterProps) {
  const [draft, setDraft] = useState(committedValue);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draft === committedValue) {
        return;
      }

      onApply({ ...getFilters(), referralSource: draft });
    }, REFERRAL_SOURCE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [committedValue, draft, getFilters, onApply]);

  return (
    <Input
      id="report-referral-source"
      placeholder="Exact referral source"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}

export function ReportFilterBar({ activities }: ReportFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authFetch } = useAuth();
  const [communities, setCommunities] = useState<Array<{ id: string; name: string }>>([]);
  const filters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams]
  );

  const getFilters = useCallback(
    () => filtersFromSearchParams(searchParams),
    [searchParams]
  );

  const customDatesIncomplete =
    filters.preset === "custom" &&
    (!filters.from.trim() || !filters.to.trim());

  useEffect(() => {
    let cancelled = false;

    void fetchCommunities(authFetch)
      .then((items) => {
        if (!cancelled) {
          setCommunities(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCommunities([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  const applyFilters = useCallback((nextFilters: ReportFilters) => {
    const params = filtersToSearchParams(nextFilters);
    router.replace(`/reports?${params.toString()}`);
  }, [router]);

  function updateFilter<K extends keyof ReportFilters>(
    key: K,
    value: ReportFilters[K]
  ) {
    applyFilters({ ...filters, [key]: value });
  }

  function clearFilter(key: ActiveChip["key"]) {
    const nextFilters = { ...filters };

    if (key === "from" || key === "to") {
      nextFilters[key] = "";
      applyFilters(nextFilters);
      return;
    }

    if (key === "leadStatus") {
      nextFilters.leadStatus = "";
    } else if (key === "activityId") {
      nextFilters.activityId = "";
    } else if (key === "community") {
      nextFilters.community = "";
    } else if (key === "referralSource") {
      nextFilters.referralSource = "";
    } else if (key === "preset") {
      nextFilters.preset = "weekly";
      nextFilters.from = "";
      nextFilters.to = "";
    }

    applyFilters(nextFilters);
  }

  function clearAllFilters() {
    router.replace("/reports");
  }

  const activeChips = useMemo(() => {
    const chips: ActiveChip[] = [];

    if (filters.preset !== "weekly") {
      chips.push({
        key: "preset",
        label:
          filters.preset === "monthly"
            ? "This month"
            : `Custom${filters.from && filters.to ? `: ${filters.from} – ${filters.to}` : ""}`,
      });
    } else if (filters.from || filters.to) {
      if (filters.from) {
        chips.push({ key: "from", label: `From ${filters.from}` });
      }

      if (filters.to) {
        chips.push({ key: "to", label: `To ${filters.to}` });
      }
    }

    if (filters.activityId) {
      const activity = activities.find((item) => item.id === filters.activityId);
      chips.push({
        key: "activityId",
        label: activity ? `Activity: ${activity.name}` : "Activity filter",
      });
    }

    if (filters.community.trim()) {
      chips.push({
        key: "community",
        label: `Community: ${filters.community.trim()}`,
      });
    }

    if (filters.leadStatus) {
      chips.push({
        key: "leadStatus",
        label: `Status: ${leadStatusLabels[filters.leadStatus as LeadStatus]}`,
      });
    }

    if (filters.referralSource.trim()) {
      chips.push({
        key: "referralSource",
        label: `Referral: ${filters.referralSource.trim()}`,
      });
    }

    return chips;
  }, [activities, filters]);

  const hasActiveFilters =
    activeChips.length > 0 ||
    filters.activityId ||
    filters.community ||
    filters.leadStatus ||
    filters.referralSource ||
    filters.preset !== "weekly" ||
    filters.from ||
    filters.to;

  return (
    <div className="space-y-4 rounded-xl border border-border-warm bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-section text-text-warm">Filters</h3>
          <p className="text-sm text-text-muted-warm">
            Combine filters with AND semantics.
          </p>
        </div>
        {hasActiveFilters ? (
          <Button type="button" variant="outline" size="sm" onClick={clearAllFilters}>
            Clear all
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="report-preset">Date preset</Label>
          <select
            id="report-preset"
            value={filters.preset}
            onChange={(event) =>
              updateFilter("preset", event.target.value as ReportPreset)
            }
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {presetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {filters.preset === "custom" ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="report-from">From</Label>
              <Input
                id="report-from"
                type="date"
                value={filters.from}
                onChange={(event) => updateFilter("from", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-to">To</Label>
              <Input
                id="report-to"
                type="date"
                value={filters.to}
                onChange={(event) => updateFilter("to", event.target.value)}
              />
            </div>
            {customDatesIncomplete ? (
              <p className="text-sm text-text-muted-warm md:col-span-2 xl:col-span-3">
                Select both dates to load the report.
              </p>
            ) : null}
          </>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="report-activity">Activity</Label>
          <select
            id="report-activity"
            value={filters.activityId}
            onChange={(event) => updateFilter("activityId", event.target.value)}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All activities</option>
            {activities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="report-community">Community</Label>
          <select
            id="report-community"
            value={filters.community}
            onChange={(event) => updateFilter("community", event.target.value)}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All communities</option>
            {communities.map((community) => (
              <option key={community.id} value={community.name}>
                {community.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="report-lead-status">Lead status</Label>
          <select
            id="report-lead-status"
            value={filters.leadStatus}
            onChange={(event) =>
              updateFilter("leadStatus", event.target.value as LeadStatus | "")
            }
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All statuses</option>
            {leadStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="report-referral-source">Referral source</Label>
          <ReferralSourceFilter
            key={filters.referralSource}
            committedValue={filters.referralSource}
            getFilters={getFilters}
            onApply={applyFilters}
          />
        </div>
      </div>

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <button
              key={`${chip.key}-${chip.label}`}
              type="button"
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-border-warm",
                "bg-muted/40 px-3 py-1 text-sm text-text-muted-warm transition-colors hover:bg-muted"
              )}
              onClick={() => clearFilter(chip.key)}
            >
              <span>{chip.label}</span>
              <span aria-hidden>×</span>
              <span className="sr-only">Remove {chip.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ensureDefaultReportSearchParams(
  searchParams: URLSearchParams
): string | null {
  if (searchParams.toString()) {
    return null;
  }

  return `/reports?${filtersToSearchParams(defaultReportFilters()).toString()}`;
}
