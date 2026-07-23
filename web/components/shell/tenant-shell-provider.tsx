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
import { syncBillingFromStripeWithAuth } from "@/lib/billing/billing-api";

const BILLING_SYNC_SESSION_KEY = "cohestra_billing_sync_attempted";

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

  useEffect(() => {
    if (status !== "authenticated" || !shell?.isTenantAdmin) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    if (window.sessionStorage.getItem(BILLING_SYNC_SESSION_KEY) === "1") {
      return;
    }

    window.sessionStorage.setItem(BILLING_SYNC_SESSION_KEY, "1");

    void syncBillingFromStripeWithAuth(authFetch)
      .then(() => refreshShell())
      .catch(() => undefined);
  }, [authFetch, refreshShell, shell?.isTenantAdmin, status]);

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
