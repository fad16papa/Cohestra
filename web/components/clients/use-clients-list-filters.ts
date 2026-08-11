"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { ClientSortBy, LeadStatus } from "@/lib/clients-api";

export type ClientSortDirection = "asc" | "desc";

export type ClientsListFilters = {
  search: string;
  leadStatus: LeadStatus | null;
  nationality: string;
  followUpDue: boolean;
  mergeSuspect: boolean;
  createdWithinDays: number | null;
  registeredWithinDays: number | null;
  activityId: string;
  activityName: string;
  sortBy: ClientSortBy;
  sortDir: ClientSortDirection;
  page: number;
};

const DEFAULT_SORT_BY: ClientSortBy = "lastRegistrationDate";
const DEFAULT_SORT_DIR: ClientSortDirection = "desc";

function parseLeadStatusFilter(value: string | null): LeadStatus | null {
  if (
    value === "new" ||
    value === "contacted" ||
    value === "active" ||
    value === "inactive"
  ) {
    return value;
  }

  return null;
}

function parsePositiveInt(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseSortBy(value: string | null): ClientSortBy {
  if (value === "name" || value === "status" || value === "lastRegistrationDate") {
    return value;
  }

  return DEFAULT_SORT_BY;
}

function parseSortDir(value: string | null): ClientSortDirection {
  return value === "asc" ? "asc" : DEFAULT_SORT_DIR;
}

function parsePage(value: string | null): number {
  const parsed = parsePositiveInt(value);
  return parsed ?? 1;
}

function clientsHref(params: URLSearchParams): string {
  return params.toString() ? `/clients?${params.toString()}` : "/clients";
}

export function useClientsListFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo<ClientsListFilters>(
    () => ({
      search: searchParams.get("search")?.trim() ?? "",
      leadStatus: parseLeadStatusFilter(searchParams.get("leadStatus")),
      nationality: searchParams.get("nationality")?.trim() ?? "",
      followUpDue: searchParams.get("followUpDue") === "true",
      mergeSuspect: searchParams.get("mergeSuspect") === "true",
      createdWithinDays: parsePositiveInt(searchParams.get("createdWithinDays")),
      registeredWithinDays: parsePositiveInt(searchParams.get("registeredWithinDays")),
      activityId: searchParams.get("activityId")?.trim() ?? "",
      activityName: searchParams.get("activityName")?.trim() ?? "",
      sortBy: parseSortBy(searchParams.get("sortBy")),
      sortDir: parseSortDir(searchParams.get("sortDir")),
      page: parsePage(searchParams.get("page")),
    }),
    [searchParams]
  );

  const replaceParams = useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutator(params);
      router.replace(clientsHref(params));
    },
    [router, searchParams]
  );

  const updateSearch = useCallback(
    (value: string) => {
      replaceParams((params) => {
        const trimmed = value.trim();
        if (trimmed) {
          params.set("search", trimmed);
        } else {
          params.delete("search");
        }
      });
    },
    [replaceParams]
  );

  const updateLeadStatus = useCallback(
    (nextStatus: LeadStatus | null) => {
      replaceParams((params) => {
        if (nextStatus) {
          params.set("leadStatus", nextStatus);
          params.delete("mergeSuspect");
          params.delete("followUpDue");
        } else {
          params.delete("leadStatus");
        }
      });
    },
    [replaceParams]
  );

  const updateNationality = useCallback(
    (nextNationality: string) => {
      replaceParams((params) => {
        if (nextNationality) {
          params.set("nationality", nextNationality);
        } else {
          params.delete("nationality");
        }
      });
    },
    [replaceParams]
  );

  const updateFollowUpDue = useCallback(
    (active: boolean) => {
      replaceParams((params) => {
        if (active) {
          params.set("followUpDue", "true");
          params.delete("mergeSuspect");
          params.delete("leadStatus");
          params.delete("registeredWithinDays");
          params.delete("createdWithinDays");
        } else {
          params.delete("followUpDue");
        }
      });
    },
    [replaceParams]
  );

  const updateMergeSuspect = useCallback(
    (active: boolean) => {
      replaceParams((params) => {
        if (active) {
          params.set("mergeSuspect", "true");
          params.delete("leadStatus");
          params.delete("registeredWithinDays");
          params.delete("createdWithinDays");
          params.delete("followUpDue");
        } else {
          params.delete("mergeSuspect");
        }
      });
    },
    [replaceParams]
  );

  const updateCreatedWithinDays = useCallback(
    (days: number | null) => {
      replaceParams((params) => {
        if (days && days > 0) {
          params.set("createdWithinDays", String(days));
        } else {
          params.delete("createdWithinDays");
        }
      });
    },
    [replaceParams]
  );

  const updateRegisteredWithinDays = useCallback(
    (days: number | null) => {
      replaceParams((params) => {
        if (days && days > 0) {
          params.set("registeredWithinDays", String(days));
          params.delete("mergeSuspect");
          params.delete("createdWithinDays");
          params.delete("followUpDue");
        } else {
          params.delete("registeredWithinDays");
        }
      });
    },
    [replaceParams]
  );

  const clearActivityFilter = useCallback(() => {
    replaceParams((params) => {
      params.delete("activityId");
      params.delete("activityName");
    });
  }, [replaceParams]);

  const updateSort = useCallback(
    (nextSortBy: ClientSortBy, nextSortDir: ClientSortDirection) => {
      replaceParams((params) => {
        params.set("sortBy", nextSortBy);
        params.set("sortDir", nextSortDir);
        params.delete("page");
      });
    },
    [replaceParams]
  );

  const updatePage = useCallback(
    (nextPage: number) => {
      replaceParams((params) => {
        if (nextPage > 1) {
          params.set("page", String(nextPage));
        } else {
          params.delete("page");
        }
      });
    },
    [replaceParams]
  );

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.leadStatus) ||
    Boolean(filters.nationality) ||
    Boolean(filters.activityId) ||
    filters.mergeSuspect ||
    filters.followUpDue ||
    Boolean(filters.createdWithinDays) ||
    Boolean(filters.registeredWithinDays);

  return {
    filters,
    hasActiveFilters,
    updateSearch,
    updateLeadStatus,
    updateNationality,
    updateFollowUpDue,
    updateMergeSuspect,
    updateCreatedWithinDays,
    updateRegisteredWithinDays,
    clearActivityFilter,
    updateSort,
    updatePage,
  };
}
