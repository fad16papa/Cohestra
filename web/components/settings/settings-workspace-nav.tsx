"use client";

import Link from "next/link";
import { ChevronRight, CreditCard, Users } from "lucide-react";

import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/settings/team",
    label: "Team",
    description: "Invite operators, roles, and seats",
    icon: Users,
  },
  {
    href: "/settings/billing",
    label: "Billing & plan",
    description: "Plans, trials, invoices, and payment",
    icon: CreditCard,
  },
] as const;

export function SettingsWorkspaceNav() {
  const { shell } = useTenantShell();

  if (!shell?.isTenantAdmin) {
    return null;
  }

  const showBilling = shell.plan === "Basic" || shell.isBillingOwner;

  const visibleItems = navItems.filter((item) =>
    item.href === "/settings/billing" ? showBilling : true
  );

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Workspace admin shortcuts"
      className="rounded-2xl border border-border-warm/80 bg-muted/20 p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted-warm">
            Workspace admin
          </p>
          <p className="mt-1 text-sm text-text-muted-warm">
            Dedicated pages for team and billing on {shell.tenantName}.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex min-h-[4.5rem] items-center gap-3 rounded-xl border border-border-warm bg-card/90 px-4 py-3",
              "transition-all hover:border-primary/25 hover:bg-card hover:shadow-sm"
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <item.icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-sm font-semibold text-text-warm">
                {item.label}
                <ChevronRight
                  className="size-4 text-text-muted-warm transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
              <span className="mt-0.5 block text-xs text-text-muted-warm sm:text-sm">
                {item.description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
