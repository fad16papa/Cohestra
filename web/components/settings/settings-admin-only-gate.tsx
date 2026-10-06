"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

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
    return (
      <p className="text-sm text-text-muted-warm">
        {areaLabel === "Team"
          ? "Team settings are available to tenant admins only."
          : "This settings area is available to tenant admins only."}
      </p>
    );
  }

  return children;
}
