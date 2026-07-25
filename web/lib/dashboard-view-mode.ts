export type DashboardViewMode = "overview" | "graphs" | "tables";

export const DASHBOARD_VIEW_MODE_STORAGE_KEY = "cohestra.dashboard.viewMode";

export const DASHBOARD_VIEW_MODE_OPTIONS: {
  value: DashboardViewMode;
  label: string;
  description: string;
}[] = [
  {
    value: "overview",
    label: "Overview",
    description: "Cards, rankings, and quick actions",
  },
  {
    value: "graphs",
    label: "Graphs",
    description: "Visual charts for metrics and activity volume",
  },
  {
    value: "tables",
    label: "Tables",
    description: "Compact rows for scanning and comparison",
  },
];

export function isDashboardViewMode(value: string | null | undefined): value is DashboardViewMode {
  return value === "overview" || value === "graphs" || value === "tables";
}

export function readDashboardViewMode(): DashboardViewMode {
  if (typeof window === "undefined") {
    return "overview";
  }

  try {
    const stored = window.localStorage.getItem(DASHBOARD_VIEW_MODE_STORAGE_KEY);
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
