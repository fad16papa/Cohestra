"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { CreditCard, Settings, Users } from "lucide-react";

import { AdminNavLockMark } from "@/components/layouts/admin-nav-lock";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import {
  entitlementContextFromShell,
  navItemAccessibleName,
  resolveFooterItems,
} from "@/lib/admin-nav-entitlements";
import {
  isSettingsBillingPath,
  isSettingsProfilePath,
  isSettingsTeamPath,
} from "@/lib/admin-canonical-routes";
import { cn } from "@/lib/utils";

type AdminNavFooterProps = {
  onNavigate?: () => void;
  className?: string;
};

const footerIcons = {
  settings: Settings,
  team: Users,
  billing: CreditCard,
} as const;

function isFooterActive(pathname: string, key: "settings" | "team" | "billing"): boolean {
  if (key === "settings") {
    return isSettingsProfilePath(pathname);
  }
  if (key === "team") {
    return isSettingsTeamPath(pathname);
  }
  return isSettingsBillingPath(pathname);
}

function footerLinkClassName(active: boolean): string {
  return cn(
    "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium motion-press",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "bg-primary/10 text-text-warm"
      : "text-text-muted-warm hover:bg-muted/60 hover:text-text-warm"
  );
}

export function AdminNavFooter({ onNavigate, className }: AdminNavFooterProps) {
  const pathname = usePathname();
  const { shell } = useTenantShell();
  const items = useMemo(
    () => resolveFooterItems(entitlementContextFromShell(shell)),
    [shell]
  );
  const showWorkspaceLabel = items.some((item) => item.key === "team" || item.key === "billing");

  return (
    <div className={cn("space-y-1 border-t border-border-warm p-2", className)}>
      {showWorkspaceLabel ? (
        <p className="px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted-warm">
          Workspace
        </p>
      ) : null}
      {items.map((item) => {
        const Icon = footerIcons[item.key];
        const locked =
          item.entitlement.state === "locked" && item.entitlement.requiredPlan;
        const accessibleName = navItemAccessibleName(item.label, item.entitlement);
        const active = isFooterActive(pathname, item.key);

        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            aria-label={locked ? accessibleName : undefined}
            title={locked ? accessibleName : undefined}
            aria-current={active ? "page" : undefined}
            className={footerLinkClassName(active)}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {item.label}
            {item.entitlement.state === "locked" && item.entitlement.requiredPlan ? (
              <AdminNavLockMark requiredPlan={item.entitlement.requiredPlan} />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
