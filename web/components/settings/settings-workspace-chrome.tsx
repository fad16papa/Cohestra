"use client";

import { CreditCard, Info, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";

import { SettingsLeftRail, type SettingsNavLinkItem } from "@/components/settings/settings-left-rail";
import { SettingsMobileSectionTabs } from "@/components/settings/settings-mobile-section-tabs";
import { SettingsRouteHeader } from "@/components/settings/settings-page-header";
import { SettingsRightRail } from "@/components/settings/settings-right-rail";
import { SettingsSectionPanel } from "@/components/settings/settings-section-panel";
import { settingsSections } from "@/components/settings/settings-sections";
import { RouteBoundaryState } from "@/components/shared/route-boundary-state";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  entitlementContextFromShell,
  isCustomDomainSettingsVisible,
  resolveNavEntitlement,
} from "@/lib/admin-nav-entitlements";
import {
  getAllSettingsRouteMeta,
  getSettingsRouteMeta,
  isSettingsDomainPath,
  resolveSettingsSearchRedirect,
  settingsPathForSectionId,
} from "@/lib/settings-routes";
import { cn } from "@/lib/utils";

function SettingsLegacySearchRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { shell } = useTenantShell();

  useEffect(() => {
    const destination = resolveSettingsSearchRedirect(
      pathname,
      new URLSearchParams(searchParams.toString()),
      shell ? shell.isTenantAdmin : null
    );
    if (destination) {
      router.replace(destination);
    }
  }, [pathname, router, searchParams, shell]);

  return null;
}

type SettingsWorkspaceChromeProps = {
  children: ReactNode;
};

function SettingsWorkspaceChromeBody({ children }: SettingsWorkspaceChromeProps) {
  const pathname = usePathname();
  const { shell } = useTenantShell();
  const entitlementCtx = useMemo(() => entitlementContextFromShell(shell), [shell]);
  const isTenantAdmin = shell?.isTenantAdmin ?? false;
  const teamEntitlement = resolveNavEntitlement("team", entitlementCtx);
  const billingEntitlement = resolveNavEntitlement("billing", entitlementCtx);
  const route = getSettingsRouteMeta(pathname);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);

  const navItems: SettingsNavLinkItem[] = useMemo(() => {
    const showTeam = teamEntitlement.state !== "hidden" && teamEntitlement.state !== "pending";
    const showBilling = billingEntitlement.state === "unlocked";
    const domainVisible = isCustomDomainSettingsVisible(entitlementCtx);

    return getAllSettingsRouteMeta().flatMap((meta) => {
      if (meta.adminOnly && !isTenantAdmin) {
        return [];
      }
      if (meta.domainOnly && !domainVisible) {
        return [];
      }
      if (meta.key === "settings-team" && !showTeam) {
        return [];
      }
      if (meta.key === "settings-billing" && !showBilling) {
        return [];
      }

      const section = settingsSections.find((item) => item.id === meta.key);
      const icon =
        meta.key === "settings-team"
          ? Users
          : meta.key === "settings-billing"
            ? CreditCard
            : section?.icon;
      if (!icon) {
        return [];
      }

      return [
        {
          href: meta.href,
          label: meta.label,
          icon,
          group: meta.group,
          lockedPlan:
            meta.key === "settings-team" && teamEntitlement.state === "locked"
              ? teamEntitlement.requiredPlan
              : null,
        },
      ];
    });
  }, [billingEntitlement.state, entitlementCtx, isTenantAdmin, teamEntitlement]);

  if (isSettingsDomainPath(pathname)) {
    if (!shell) {
      return (
        <>
          <SettingsLegacySearchRedirect />
          <p className="text-sm text-text-muted-warm">Loading settings…</p>
        </>
      );
    }
    if (!isCustomDomainSettingsVisible(entitlementCtx)) {
      return <RouteBoundaryState kind="not-found" surface="admin" />;
    }
  }

  const activeHref = route?.href ?? null;
  const headerRoute =
    route ??
    getAllSettingsRouteMeta().find(
      (item) => item.href === settingsPathForSectionId("settings-account")
    );

  if (!headerRoute) {
    return (
      <>
        <SettingsLegacySearchRedirect />
        {children}
      </>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 pb-8 lg:gap-5">
      <SettingsLegacySearchRedirect />
      <SettingsRouteHeader route={headerRoute} />

      <SettingsMobileSectionTabs items={navItems} activeHref={activeHref} />

      <div className="flex items-center justify-end lg:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 gap-2 border-border-warm"
          onClick={() => setMobileContextOpen(true)}
        >
          <Info className="size-4" aria-hidden />
          Context
        </Button>
      </div>

      <div
        className={cn(
          "flex min-h-[28rem] w-full overflow-hidden rounded-2xl border border-border-warm/80",
          "bg-card/40 shadow-sm"
        )}
      >
        <SettingsLeftRail
          className="hidden border-r lg:flex"
          items={navItems}
          activeHref={activeHref}
          collapsed={leftCollapsed}
          onToggleCollapsed={() => setLeftCollapsed((value) => !value)}
        />

        <section
          className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
          aria-label={route?.label ?? "Settings"}
        >
          <SettingsSectionPanel>{children}</SettingsSectionPanel>
        </section>

        <SettingsRightRail
          className="hidden border-l xl:flex"
          activeId={route?.key ?? null}
          collapsed={rightCollapsed}
          onToggleCollapsed={() => setRightCollapsed((value) => !value)}
        />
      </div>

      <Sheet open={mobileContextOpen} onOpenChange={setMobileContextOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] p-0">
          <SheetHeader className="border-b border-border-warm px-4 py-3">
            <SheetTitle>Context</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto p-4">
            <SettingsRightRail
              className="w-full border-0 bg-transparent"
              activeId={route?.key ?? null}
              collapsed={false}
              onToggleCollapsed={() => setMobileContextOpen(false)}
              hideCollapseToggle
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function SettingsWorkspaceChrome({ children }: SettingsWorkspaceChromeProps) {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted-warm">Loading settings…</p>}>
      <SettingsWorkspaceChromeBody>{children}</SettingsWorkspaceChromeBody>
    </Suspense>
  );
}
