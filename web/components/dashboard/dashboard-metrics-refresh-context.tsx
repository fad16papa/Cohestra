"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type DashboardMetricsRefreshContextValue = {
  lastUpdatedAt: Date | null;
  setLastUpdatedAt: (date: Date) => void;
};

const DashboardMetricsRefreshContext =
  createContext<DashboardMetricsRefreshContextValue | null>(null);

export function DashboardMetricsRefreshProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const value = useMemo(
    () => ({ lastUpdatedAt, setLastUpdatedAt }),
    [lastUpdatedAt]
  );

  return (
    <DashboardMetricsRefreshContext.Provider value={value}>
      {children}
    </DashboardMetricsRefreshContext.Provider>
  );
}

export function useDashboardMetricsRefresh() {
  return useContext(DashboardMetricsRefreshContext);
}
