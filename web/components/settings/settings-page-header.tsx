"use client";

import { PageHeader } from "@/components/shared/page-header";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { PlanBadge } from "@/components/shell/plan-badge";
import { SponsoredBadge } from "@/components/shell/sponsored-badge";

export function SettingsPageHeader() {
  const { shell } = useTenantShell();

  return (
    <PageHeader
      eyebrow="Workspace"
      title="Settings"
      description={
        <>
          {shell ? (
            <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-text-warm">
              <p>{shell.tenantName}</p>
              <PlanBadge plan={shell.plan} />
              {shell.billingStatus && shell.billingStatus !== "Free" ? (
                <span className="inline-flex items-center rounded-full border border-border-control bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                  {shell.billingStatus}
                </span>
              ) : null}
              {shell.isComplimentary ? <SponsoredBadge /> : null}
            </div>
          ) : null}
          <p className="max-w-3xl leading-relaxed text-text-muted-warm">
            Use the section list to navigate settings. Workspace admins can manage branding,
            limits, and organization preferences from the panels below.
          </p>
        </>
      }
    />
  );
}
