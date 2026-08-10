"use client";

import Link from "next/link";
import { ChevronRight, CreditCard, Users } from "lucide-react";

import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/settings/team",
    label: "Team",
    description: "Invite operators, manage roles, and seat usage.",
    icon: Users,
  },
  {
    href: "/settings/billing",
    label: "Billing & plan",
    description: "Compare plans, trials, invoices, and payment method.",
    icon: CreditCard,
  },
] as const;

export function SettingsWorkspaceNav() {
  const { shell } = useTenantShell();

  if (!shell?.isTenantAdmin) {
    return null;
  }

  const showBilling =
    shell.plan === "Basic" || shell.isBillingOwner;

  const visibleItems = navItems.filter((item) =>
    item.href === "/settings/billing" ? showBilling : true
  );

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-section text-text-warm">Workspace admin</h2>
        <p className="mt-1 text-sm text-text-muted-warm">
          Team and billing settings for {shell.tenantName}.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-start gap-3 rounded-xl border border-border-warm bg-card p-4",
              "transition-colors hover:border-lagoon/30 hover:bg-muted/30"
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-lagoon/10 text-lagoon">
              <item.icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 font-medium text-text-warm">
                {item.label}
                <ChevronRight
                  className="size-4 text-text-muted-warm transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
              <span className="mt-1 block text-sm text-text-muted-warm">
                {item.description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
