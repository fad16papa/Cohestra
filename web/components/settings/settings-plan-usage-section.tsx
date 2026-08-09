"use client";

import Link from "next/link";

import { LimitMeter } from "@/components/shell/limit-meter";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SettingsPlanUsageSection() {
  const { shell } = useTenantShell();

  if (!shell?.isTenantAdmin || shell.limitDials.length === 0) {
    return null;
  }

  const usageDials = shell.limitDials.filter((dial) => dial.key !== "seats");

  if (usageDials.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-section text-text-warm">Plan usage</h2>
          <p className="mt-1 text-sm text-text-muted-warm">
            Headroom for published activities and monthly registrations on your{" "}
            <span className="font-medium text-text-warm">{shell.plan}</span> plan.
          </p>
        </div>
        <Link
          href="/settings/billing"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "shrink-0 border-border-warm"
          )}
        >
          View billing
        </Link>
      </div>

      <div className="rounded-xl border border-border-warm bg-muted/20 p-4 sm:max-w-md">
        <LimitMeter dials={usageDials} />
      </div>
    </section>
  );
}
