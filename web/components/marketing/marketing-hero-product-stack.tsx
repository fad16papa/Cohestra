import { DashboardRegistrationsTrendChart } from "@/components/dashboard/dashboard-registrations-trend-chart";
import {
  HERO_DASHBOARD_TREND_DAYS,
  HERO_DASHBOARD_TREND_POINTS,
  heroRegistrationsThisWeek,
  heroWeeklyRegistrationsDeltaPercent,
} from "@/lib/marketing/hero-dashboard-trend";
import { cn } from "@/lib/utils";

const ROOMS = [
  { label: "Dashboard", mark: "current" as const },
  { label: "Clients", mark: null },
  { label: "Activities", mark: null },
  { label: "Follow-up", mark: null },
  { label: "Analytics", mark: null },
  { label: "Cohestra AI", mark: null },
  { label: "Website", mark: "Core" as const },
  { label: "Campaigns", mark: "Pro" as const },
] as const;

const VIEWS = [
  { label: "Overview", current: true },
  { label: "Graphs", current: false },
  { label: "Table", current: false },
] as const;

/**
 * DemoClub dashboard sample (Harbourline), the same deterministic state used by
 * the marketing demo mounts. Not a customer result.
 */
function buildKpiTiles() {
  const weekRegistrations = heroRegistrationsThisWeek(HERO_DASHBOARD_TREND_POINTS);
  const weekDelta = heroWeeklyRegistrationsDeltaPercent(HERO_DASHBOARD_TREND_POINTS);
  const deltaLabel =
    weekDelta >= 0 ? `+${weekDelta}% vs previous 7 days` : `${weekDelta}% vs previous 7 days`;

  return [
    { label: "Total leads", value: "248", hint: "All captured contacts" },
    {
      label: "Registrations this week",
      value: String(weekRegistrations),
      hint: deltaLabel,
    },
    { label: "Active activities", value: "3", hint: "Live registration forms" },
    { label: "Follow-up coverage", value: "79%", hint: "Leads contacted vs new" },
  ] as const;
}

const ACTIVITIES = [
  { name: "Golden Hour Run", count: 34 },
  { name: "Board Game Night", count: 12 },
  { name: "Sunday Pickleball", count: 8 },
] as const;

export function MarketingHeroProductStack({ className }: { className?: string }) {
  const kpiTiles = buildKpiTiles();

  return (
    <figure
      className={cn("marketing-product-lift relative mx-auto w-full", className)}
      aria-label="Product preview of the Dashboard"
    >
      <div className="overflow-hidden rounded-[24px] border border-border-warm bg-card shadow-[0_28px_60px_rgba(7,13,18,0.12)]">
        <div className="flex items-center justify-between gap-3 border-b border-border-warm px-4 py-3 sm:px-5">
          <p className="text-label text-text-accent">Product preview</p>
          <p className="text-xs text-text-muted-warm">Dashboard</p>
        </div>

        <div className="grid sm:grid-cols-[9.5rem_minmax(0,1fr)]">
          <ul className="hidden border-r border-border-warm bg-muted/30 py-2 sm:block" aria-hidden>
            {ROOMS.map((room) => {
              const current = room.mark === "current";
              return (
                <li key={room.label}>
                  <div
                    className={cn(
                      "flex items-center justify-between gap-2 px-3 py-1.5 text-[0.8125rem]",
                      current
                        ? "border-l-2 border-lagoon bg-background font-semibold text-text-warm"
                        : "border-l-2 border-transparent text-text-muted-warm"
                    )}
                  >
                    <span className="truncate">{room.label}</span>
                    {room.mark && room.mark !== "current" ? (
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[0.625rem] font-medium uppercase text-text-warm">
                        {room.mark}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="min-w-0 px-4 py-4 sm:px-5 sm:py-4">
            <ul className="mb-3 flex flex-wrap gap-1.5 sm:hidden" aria-hidden>
              {ROOMS.map((room) => (
                <li
                  key={room.label}
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-1 text-[0.6875rem] font-medium",
                    room.mark === "current"
                      ? "border-lagoon bg-lagoon/10 text-text-warm"
                      : "border-border-warm text-text-muted-warm"
                  )}
                >
                  {room.label}
                  {room.mark && room.mark !== "current" ? ` · ${room.mark}` : ""}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-end justify-between gap-3">
              <p className="font-[family-name:var(--font-fraunces)] text-[1.35rem] font-medium tracking-[-0.03em] text-text-warm">
                Dashboard
              </p>
              <div className="inline-flex rounded-xl border border-border-warm bg-muted/30 p-1" aria-hidden>
                {VIEWS.map((view) => (
                  <span
                    key={view.label}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium",
                      view.current
                        ? "bg-background text-text-warm shadow-sm"
                        : "text-text-muted-warm"
                    )}
                  >
                    {view.label}
                  </span>
                ))}
              </div>
            </div>

            <ul className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {kpiTiles.map((tile) => (
                <li
                  key={tile.label}
                  className="min-w-0 rounded-[16px] border border-border-warm bg-card px-3 py-3"
                >
                  <p className="text-[0.6875rem] font-medium leading-snug text-text-muted-warm">{tile.label}</p>
                  <p className="mt-1 font-[family-name:var(--font-fraunces)] text-[1.35rem] font-medium tabular-nums tracking-[-0.03em] text-text-warm">
                    {tile.value}
                  </p>
                  <p className="mt-1 text-[0.6875rem] leading-snug text-text-muted-warm">{tile.hint}</p>
                </li>
              ))}
            </ul>

            <DashboardRegistrationsTrendChart
              points={HERO_DASHBOARD_TREND_POINTS}
              trendDays={HERO_DASHBOARD_TREND_DAYS}
              compact
              cssResponsive
              animate={false}
              rangeTimeZoneLabel="Asia/Singapore"
              headingId="marketing-hero-registrations-trend"
              className="mt-3"
            />

            <section className="mt-3" aria-hidden>
              <h3 className="text-xs font-semibold tracking-[0.04em] text-text-muted-warm">
                Activity performance
              </h3>
              <p className="mt-0.5 text-[0.6875rem] text-text-muted-warm">
                Registrations by activity for this week, ranked by volume.
              </p>
              <ul className="mt-2 space-y-1.5">
                {ACTIVITIES.map((activity) => (
                  <li key={activity.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <div className="min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium text-text-warm">{activity.name}</p>
                        <p className="shrink-0 text-xs tabular-nums text-text-muted-warm">{activity.count}</p>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted/60">
                        <div
                          className="h-full rounded-full bg-[var(--chart-1)]"
                          style={{ width: `${Math.round((activity.count / ACTIVITIES[0].count) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs leading-relaxed text-text-muted-warm">
        Sample state, not a customer result.
      </figcaption>
    </figure>
  );
}