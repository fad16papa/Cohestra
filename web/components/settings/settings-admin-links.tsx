"use client";

import Link from "next/link";

import { useTenantShell } from "@/components/shell/tenant-shell-provider";

export function SettingsAdminLinks() {
  const { shell } = useTenantShell();

  if (!shell?.isTenantAdmin) {
    return null;
  }

  return (
    <p className="text-sm text-text-muted-warm">
      {" "}
      <Link href="/settings/team" className="text-lagoon hover:text-ink">
        Team
      </Link>
      {" · "}
      <Link href="/settings/billing" className="text-lagoon hover:text-ink">
        Billing &amp; plan
      </Link>
    </p>
  );
}
