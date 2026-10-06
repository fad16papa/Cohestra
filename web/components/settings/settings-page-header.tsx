"use client";

import { PageHeader } from "@/components/shared/page-header";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { PlanBadge } from "@/components/shell/plan-badge";
import { SponsoredBadge } from "@/components/shell/sponsored-badge";
import type { SettingsRouteMeta } from "@/lib/settings-routes";

type SettingsRouteHeaderProps = {
  route: SettingsRouteMeta;
};

export function SettingsRouteHeader({ route }: SettingsRouteHeaderProps) {
  const { shell } = useTenantShell();

  return (
    <PageHeader
      eyebrow="Settings"
      title={route.label}
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
          <p className="max-w-3xl leading-relaxed text-text-muted-warm">{route.description}</p>
        </>
      }
    />
  );
}
