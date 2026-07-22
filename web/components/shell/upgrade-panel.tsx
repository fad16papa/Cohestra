"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

import { marketingAtelierButtonClass } from "@/components/marketing/marketing-shell";
import { cn } from "@/lib/utils";

type UpgradePanelProps = {
  title: string;
  description: string;
  requiredPlan: "Core" | "Pro";
  isTenantAdmin: boolean;
  checkoutHref?: string;
  className?: string;
};

export function UpgradePanel({
  title,
  description,
  requiredPlan,
  isTenantAdmin,
  checkoutHref,
  className,
}: UpgradePanelProps) {
  const defaultCheckout =
    requiredPlan === "Pro"
      ? "/billing/checkout?plan=pro&interval=monthly"
      : "/billing/checkout?plan=core&interval=monthly";

  return (
    <section
      className={cn(
        "mx-auto max-w-xl rounded-2xl border border-line bg-paper-warm p-8 text-center",
        className
      )}
      aria-labelledby="upgrade-panel-title"
    >
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
        <Lock className="size-5 text-stone" aria-hidden />
      </div>
      <h2 id="upgrade-panel-title" className="mt-4 text-lg font-semibold text-ink">
        {title}
      </h2>
      <p className="mt-2 text-sm text-stone">{description}</p>
      <p className="mt-3 text-xs text-stone">
        Requires <span className="font-medium text-ink">{requiredPlan}</span> plan or higher.
      </p>
      {isTenantAdmin ? (
        <Link
          href={checkoutHref ?? defaultCheckout}
          className={cn(marketingAtelierButtonClass("lagoon"), "mt-6 inline-flex")}
        >
          Upgrade to {requiredPlan}
        </Link>
      ) : (
        <p className="mt-6 text-sm text-stone" role="status">
          This feature is locked on your workspace plan. Ask a tenant admin to upgrade.
        </p>
      )}
    </section>
  );
}
