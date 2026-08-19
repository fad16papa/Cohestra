"use client";

import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { PlanBadge } from "@/components/shell/plan-badge";
import { SponsoredBadge } from "@/components/shell/sponsored-badge";

export function SettingsPageHeader() {
  const { shell } = useTenantShell();

  return (
    <header className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted-warm">
          Workspace
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-text-warm sm:text-2xl">
            {shell?.tenantName ?? "Settings"}
          </h1>
          {shell ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <PlanBadge plan={shell.plan} />
              {shell.billingStatus && shell.billingStatus !== "Free" ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-text-muted-warm">
                  {shell.billingStatus}
                </span>
              ) : null}
              {shell.isComplimentary ? <SponsoredBadge /> : null}
            </div>
          ) : null}
        </div>
      </div>
      <p className="max-w-2xl text-sm leading-relaxed text-text-muted-warm">
        Manage your operator account, workspace branding, and organization preferences.
        Billing and team access live in dedicated pages below.
      </p>
    </header>
  );
}
