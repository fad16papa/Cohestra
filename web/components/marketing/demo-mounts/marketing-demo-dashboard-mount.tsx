"use client";

import { DashboardRegistrationsTrendChart } from "@/components/dashboard/dashboard-registrations-trend-chart";
import { LeadStatusBadge } from "@/components/clients/lead-status-badge";
import { MarketingDemoTheme } from "@/components/marketing/marketing-demo-theme";
import { useMarketingDemoClub } from "@/components/marketing/marketing-demo-provider";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { getDashboardQueue } from "@/lib/marketing/marketing-demo-club";

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-stone-cinema">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-stone-cinema">{hint}</p>
    </div>
  );
}

export function MarketingDemoDashboardMount() {
  const club = useMarketingDemoClub();
  const queue = getDashboardQueue(club);
  const metrics = club.dashboard;

  return (
    <MarketingDemoTheme>
      <div className="flex h-full min-h-0 flex-col gap-3 bg-paper-warm p-3">
        <div className="rounded-2xl border border-line bg-paper px-4 py-3">
          <p className="text-xs text-stone-cinema">{club.orgName} · this week</p>
          <p className="text-lg font-semibold text-ink">Good morning, {club.operatorGreeting}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Metric label="Leads" value={String(metrics.totalLeads)} hint="Named people" />
          <Metric
            label="Registrations"
            value={String(metrics.registrationsInPeriod)}
            hint="This week"
          />
          <Metric
            label="Activities"
            value={String(metrics.activeActivitiesCount)}
            hint="Golden Hour on the board"
          />
          <Metric
            label="Follow-up"
            value={`${metrics.followUpCoveragePercent}%`}
            hint="Coverage"
          />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <DashboardRegistrationsTrendChart
            points={metrics.registrationsTrend}
            trendDays={metrics.trendDays}
            compact
            className="h-full min-h-[10rem]"
          />
          <div className="rounded-xl border border-line bg-paper">
            <p className="border-b border-line px-3 py-2 text-xs font-medium uppercase tracking-wide text-stone-cinema">
              Follow-up queue
            </p>
            <ul>
              {queue.map((client) => (
                <li
                  key={client.id}
                  className="flex items-center gap-2.5 border-b border-line px-3 py-2 last:border-b-0"
                >
                  <PersonAvatar name={client.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{client.fullName}</p>
                    <p className="truncate text-xs text-stone-cinema">{client.lastActivityName}</p>
                  </div>
                  <LeadStatusBadge status={client.leadStatus} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </MarketingDemoTheme>
  );
}
