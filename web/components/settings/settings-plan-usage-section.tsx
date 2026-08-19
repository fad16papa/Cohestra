"use client";

import { LimitMeter } from "@/components/shell/limit-meter";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";

export function SettingsPlanUsageSection({ embedded = false }: { embedded?: boolean }) {
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
      {!embedded ? (
        <div>
          <h2 className="text-section text-text-warm">Plan usage</h2>
          <p className="mt-1 text-sm text-text-muted-warm">
            Headroom for published activities and monthly registrations on your{" "}
            <span className="font-medium text-text-warm">{shell.plan}</span> plan.
          </p>
        </div>
      ) : null}

      <div
        className={
          embedded
            ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            : "rounded-xl border border-border-warm bg-muted/20 p-4 sm:max-w-md"
        }
      >
        {embedded ? (
          usageDials.map((dial) => (
            <div
              key={dial.key}
              className="rounded-xl border border-border-warm/80 bg-muted/20 p-4"
            >
              <LimitMeter dials={[dial]} />
            </div>
          ))
        ) : (
          <LimitMeter dials={usageDials} />
        )}
      </div>
    </section>
  );
}
