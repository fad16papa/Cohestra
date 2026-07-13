import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import type { DashboardMetrics } from "@/lib/dashboard-api";

type DashboardTodayStripProps = {
  metrics: DashboardMetrics;
  periodLabel: string;
};

type TodayItem = {
  label: string;
  href: string;
  emphasis?: boolean;
};

function buildTodayItems(
  metrics: DashboardMetrics,
  periodLabel: string
): TodayItem[] {
  const items: TodayItem[] = [];

  if (metrics.newLeadsInPeriod > 0) {
    items.push({
      label: `${metrics.newLeadsInPeriod} new lead${metrics.newLeadsInPeriod === 1 ? "" : "s"} ${periodLabel}`,
      href: `/clients?registeredWithinDays=${metrics.periodDays}`,
      emphasis: true,
    });
  }

  if (metrics.followUpCoveragePercent < 100) {
    items.push({
      label: "Leads still waiting for first follow-up",
      href: "/clients?leadStatus=new",
    });
  }

  if (metrics.activeActivitiesCount > 0) {
    items.push({
      label: `${metrics.activeActivitiesCount} live activit${metrics.activeActivitiesCount === 1 ? "y" : "ies"} accepting registrations`,
      href: "/activities?status=published",
    });
  }

  if (items.length === 0) {
    items.push({
      label: "You're all caught up — great time to plan the next campaign",
      href: "/campaigns/new",
    });
  }

  return items.slice(0, 3);
}

export function DashboardTodayStrip({
  metrics,
  periodLabel,
}: DashboardTodayStripProps) {
  const items = buildTodayItems(metrics, periodLabel);

  return (
    <section
      aria-label="Today at a glance"
      className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card/80 to-card/80 p-4 backdrop-blur-sm"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-text-warm">
        <Sparkles className="size-4 text-primary" aria-hidden />
        Today
      </div>
      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {items.map((item) => (
          <li key={item.href + item.label}>
            <Link
              href={item.href}
              className="group inline-flex items-center gap-2 rounded-lg border border-border-warm/80 bg-background/60 px-3 py-2 text-sm transition-colors hover:border-primary/30 hover:bg-background"
            >
              <span className={item.emphasis ? "font-medium text-text-warm" : "text-text-muted-warm"}>
                {item.label}
              </span>
              <ArrowRight
                className="size-3.5 text-text-muted-warm transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
