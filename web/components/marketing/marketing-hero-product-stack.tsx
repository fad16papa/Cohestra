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
const KPI_TILES = [
  { label: "Total leads", value: "248", hint: "All captured contacts" },
  { label: "Registrations this week", value: "48", hint: "+33% vs previous 7 days" },
  { label: "Active activities", value: "3", hint: "Live registration forms" },
  { label: "Follow-up coverage", value: "79%", hint: "Leads contacted vs new" },
] as const;

const TREND = [
  { label: "1 Sep", registrations: 5, newClients: 2 },
  { label: "2 Sep", registrations: 4, newClients: 1 },
  { label: "3 Sep", registrations: 6, newClients: 2 },
  { label: "4 Sep", registrations: 12, newClients: 4 },
  { label: "5 Sep", registrations: 7, newClients: 3 },
  { label: "6 Sep", registrations: 9, newClients: 4 },
  { label: "7 Sep", registrations: 5, newClients: 2 },
] as const;

const ACTIVITIES = [
  { name: "Golden Hour Run", count: 34 },
  { name: "Board Game Night", count: 12 },
  { name: "Sunday Pickleball", count: 8 },
] as const;

const TREND_MAX = 12;
const CHART_WIDTH = 280;
const CHART_HEIGHT = 72;

function chartPoint(index: number, value: number): [number, number] {
  const x = (index / (TREND.length - 1)) * CHART_WIDTH;
  const y = CHART_HEIGHT - (value / TREND_MAX) * (CHART_HEIGHT - 6) - 2;
  return [x, y];
}

function areaPath(key: "registrations" | "newClients"): { line: string; area: string } {
  const points = TREND.map((point, index) => chartPoint(index, point[key]));
  const line = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${CHART_WIDTH} ${CHART_HEIGHT} L0 ${CHART_HEIGHT} Z`;
  return { line, area };
}

export function MarketingHeroProductStack({ className }: { className?: string }) {
  const registrations = areaPath("registrations");
  const newClients = areaPath("newClients");

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
              {KPI_TILES.map((tile) => (
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

            <section className="mt-3 overflow-hidden rounded-xl border border-border-warm bg-card/90" aria-hidden>
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border-warm/70 px-3 py-2.5">
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold tracking-[0.04em] text-text-muted-warm">
                    Registrations trend
                  </h3>
                  <p className="mt-0.5 text-[0.6875rem] text-text-muted-warm">
                    Daily registrations and first-time clients, last 7 days.
                  </p>
                </div>
                <p className="flex shrink-0 items-center gap-3 text-[0.625rem] font-medium text-text-muted-warm">
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-[var(--chart-1)]" />
                    Registrations
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-[var(--chart-4)]" />
                    New clients
                  </span>
                </p>
              </div>
              <div className="px-3 py-3">
                <svg
                  viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                  className="h-20 w-full sm:h-24"
                  role="img"
                >
                  <title>Registrations trend for the last 7 days</title>
                  <path d={registrations.area} fill="var(--chart-1)" opacity="0.18" />
                  <path d={newClients.area} fill="var(--chart-4)" opacity="0.22" />
                  <path
                    d={registrations.line}
                    fill="none"
                    stroke="var(--chart-1)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <path
                    d={newClients.line}
                    fill="none"
                    stroke="var(--chart-4)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="mt-1 flex justify-between text-[0.625rem] text-text-muted-warm">
                  <span>{TREND[0].label}</span>
                  <span>{TREND[TREND.length - 1].label}</span>
                </div>
              </div>
            </section>

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
