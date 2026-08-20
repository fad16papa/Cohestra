"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Settings, Users } from "lucide-react";

import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { cn } from "@/lib/utils";

type AdminNavFooterProps = {
  onNavigate?: () => void;
  className?: string;
};

function footerLinkClassName(active: boolean): string {
  return cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
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

  if (!isTenantAdmin && pathname !== "/settings") {
    return (
      <div className={cn("space-y-1 border-t border-border-warm p-2", className)}>
        <Link
          href="/settings"
          onClick={onNavigate}
          className={footerLinkClassName(pathname.startsWith("/settings"))}
        >
          <Settings className="size-4 shrink-0" aria-hidden />
          Settings
        </Link>
      </div>
    );
  }

  if (!isTenantAdmin) {
    return null;
  }

  return (
    <div className={cn("space-y-1 border-t border-border-warm p-2", className)}>
      <p className="px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted-warm">
        Workspace
      </p>
      <Link
        href="/settings"
        onClick={onNavigate}
        className={footerLinkClassName(
          pathname === "/settings" || pathname.startsWith("/settings/")
        )}
      >
        <Settings className="size-4 shrink-0" aria-hidden />
        Settings
      </Link>
      <Link
        href="/settings/team"
        onClick={onNavigate}
        className={footerLinkClassName(pathname.startsWith("/settings/team"))}
      >
        <Users className="size-4 shrink-0" aria-hidden />
        Team
      </Link>
      {showBilling ? (
        <Link
          href="/settings/billing"
          onClick={onNavigate}
          className={footerLinkClassName(pathname.startsWith("/settings/billing"))}
        >
          <CreditCard className="size-4 shrink-0" aria-hidden />
          Billing
        </Link>
      ) : null}
    </div>
  );
}
