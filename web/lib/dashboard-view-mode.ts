export type DashboardViewMode = "overview" | "graphs" | "table";

export const DASHBOARD_VIEW_QUERY_KEY = "view";
export const DASHBOARD_VIEW_MODE_STORAGE_KEY = "cohestra.dashboard.viewMode";

export const DASHBOARD_VIEW_MODE_OPTIONS: {
  value: DashboardViewMode;
  label: string;
  description: string;
}[] = [
  {
    value: "overview",
    label: "Overview",
    description: "Needs attention, follow-up, and today’s work",
  },
  {
    value: "graphs",
    label: "Graphs",
    description: "Charts for metrics and activity volume",
  },
  {
    value: "table",
    label: "Table",
    description: "Compact rows for scanning and comparison",
  },
];

export function isDashboardViewMode(value: string | null | undefined): value is DashboardViewMode {
  return value === "overview" || value === "graphs" || value === "table";
}

function migrateStoredView(value: string | null): string | null {
  if (value === "tables") {
    return "table";
  }
  return value;
}

export function parseDashboardViewParam(
  value: string | null | undefined
): DashboardViewMode | "absent" | "invalid" {
  if (value == null || value === "") {
    return "absent";
  }
  if (isDashboardViewMode(value)) {
    return value;
  }
  return "invalid";
}

export function readDashboardViewMode(): DashboardViewMode {
  if (typeof window === "undefined") {
    return "overview";
  }

  try {
    const stored = migrateStoredView(window.localStorage.getItem(DASHBOARD_VIEW_MODE_STORAGE_KEY));
    return isDashboardViewMode(stored) ? stored : "overview";
  } catch {
    return "overview";
  }
}

export function writeDashboardViewMode(mode: DashboardViewMode): void {
  try {
    window.localStorage.setItem(DASHBOARD_VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore private browsing / quota errors.
  }
}

export function resolveDashboardView(
  queryValue: string | null | undefined,
  storedValue: DashboardViewMode = "overview"
): DashboardViewMode {
  const parsed = parseDashboardViewParam(queryValue);
  if (parsed === "absent") {
    return storedValue;
  }
  if (parsed === "invalid") {
    return "overview";
  }
  return parsed;
}

/** Omit the query for default overview so shared `/dashboard` stays clean. */
export function serializeDashboardViewParam(mode: DashboardViewMode): string | null {
  return mode === "overview" ? null : mode;
}

export function dashboardHrefForView(mode: DashboardViewMode, currentSearch = ""): string {
  const params = new URLSearchParams(currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch);
  const serialized = serializeDashboardViewParam(mode);
  if (serialized) {
    params.set(DASHBOARD_VIEW_QUERY_KEY, serialized);
  } else {
    params.delete(DASHBOARD_VIEW_QUERY_KEY);
  }
  const query = params.toString();
  return query.length > 0 ? `/dashboard?${query}` : "/dashboard";
}
