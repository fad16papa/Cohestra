"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ProductErrorState } from "@/components/shared/product-error-state";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { SETTINGS_PROFILE_PATH } from "@/lib/admin-canonical-routes";

type SettingsAdminOnlyGateProps = {
  areaLabel: string;
  children: ReactNode;
};

export function SettingsAdminOnlyGate({ areaLabel, children }: SettingsAdminOnlyGateProps) {
  const router = useRouter();
  const { shell } = useTenantShell();

  useEffect(() => {
    if (shell && !shell.isTenantAdmin) {
      router.replace(SETTINGS_PROFILE_PATH);
    }
  }, [router, shell]);

  if (!shell?.isTenantAdmin) {
    const isTeam = areaLabel === "Team";
    return (
      <ProductErrorState
        title={
          isTeam
            ? "You don't have permission to manage Team"
            : `You don't have permission to manage ${areaLabel}`
        }
        message={
          isTeam
            ? "Team settings are available to tenant admins only."
            : `${areaLabel} is available to tenant admins only.`
        }
        backHref={SETTINGS_PROFILE_PATH}
        backLabel="Back to your account"
      />
    );
  }

  return children;
}
