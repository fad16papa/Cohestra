"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  fetchTenantShell,
  type TenantShell,
} from "@/lib/shell/tenant-shell-api";

type TenantShellContextValue = {
  shell: TenantShell | null;
  loading: boolean;
  error: string | null;
  refreshShell: () => Promise<void>;
};

const TenantShellContext = createContext<TenantShellContextValue | null>(null);

export function TenantShellProvider({ children }: { children: ReactNode }) {
  const { authFetch, status } = useAuth();
  const [shell, setShell] = useState<TenantShell | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshShell = useCallback(async () => {
    if (status !== "authenticated") {
      setShell(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const next = await fetchTenantShell(authFetch);
      setShell(next);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load workspace shell."
      );
    } finally {
      setLoading(false);
    }
  }, [authFetch, status]);

  useEffect(() => {
    void refreshShell();
  }, [refreshShell]);

  const value = useMemo(
    () => ({ shell, loading, error, refreshShell }),
    [error, loading, refreshShell, shell]
  );

  return (
    <TenantShellContext.Provider value={value}>{children}</TenantShellContext.Provider>
  );
}

export function useTenantShell() {
  const context = useContext(TenantShellContext);
  if (!context) {
    throw new Error("useTenantShell must be used within TenantShellProvider");
  }

  return context;
}
