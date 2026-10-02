"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Settings, Users } from "lucide-react";

import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import {
  SETTINGS_BILLING_PATH,
  SETTINGS_PROFILE_PATH,
  SETTINGS_TEAM_PATH,
  isSettingsBillingPath,
  isSettingsProfilePath,
  isSettingsTeamPath,
} from "@/lib/admin-canonical-routes";
import { cn } from "@/lib/utils";

type AdminNavFooterProps = {
  onNavigate?: () => void;
  className?: string;
};

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
  const showBilling = shell?.plan === "Basic" || shell?.isBillingOwner === true;
  const isTenantAdmin = shell?.isTenantAdmin ?? false;

  if (!isTenantAdmin) {
    return (
      <div className={cn("space-y-1 border-t border-border-warm p-2", className)}>
        <Link
          href={SETTINGS_PROFILE_PATH}
          onClick={onNavigate}
          aria-current={isSettingsProfilePath(pathname) ? "page" : undefined}
          className={footerLinkClassName(isSettingsProfilePath(pathname))}
        >
          <Settings className="size-4 shrink-0" aria-hidden />
          Settings
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1 border-t border-border-warm p-2", className)}>
      <p className="px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted-warm">
        Workspace
      </p>
      <Link
        href={SETTINGS_PROFILE_PATH}
        onClick={onNavigate}
        aria-current={isSettingsProfilePath(pathname) ? "page" : undefined}
        className={footerLinkClassName(isSettingsProfilePath(pathname))}
      >
        <Settings className="size-4 shrink-0" aria-hidden />
        Settings
      </Link>
      <Link
        href={SETTINGS_TEAM_PATH}
        onClick={onNavigate}
        aria-current={isSettingsTeamPath(pathname) ? "page" : undefined}
        className={footerLinkClassName(isSettingsTeamPath(pathname))}
      >
        <Users className="size-4 shrink-0" aria-hidden />
        Team
      </Link>
      {showBilling ? (
        <Link
          href={SETTINGS_BILLING_PATH}
          onClick={onNavigate}
          aria-current={isSettingsBillingPath(pathname) ? "page" : undefined}
          className={footerLinkClassName(isSettingsBillingPath(pathname))}
        >
          <CreditCard className="size-4 shrink-0" aria-hidden />
          Billing
        </Link>
      ) : null}
    </div>
  );
}
