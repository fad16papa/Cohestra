"use client";

import { ActivityStatusBadge } from "@/components/activities/activity-status-badge";
import { MarketingDemoTheme } from "@/components/marketing/marketing-demo-theme";
import { useMarketingDemoClub } from "@/components/marketing/marketing-demo-provider";
import { PersonAvatar } from "@/components/shared/person-avatar";
import {
  GOLDEN_HOUR_UPCOMING_ID,
  getActivityOps,
  getActivityRegistrants,
} from "@/lib/marketing/marketing-demo-club";
import { cn } from "@/lib/utils";

function formatWhen(iso: string, timeZoneId: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString("en-SG", {
    timeZone: timeZoneId,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MarketingDemoActivitiesMount() {
  const club = useMarketingDemoClub();
  const selectedId = GOLDEN_HOUR_UPCOMING_ID;
  const selectedOps = getActivityOps(club, selectedId);
  const roster = getActivityRegistrants(club, selectedId).slice(0, 12);
  const venue =
    club.website.upcomingActivities.find((row) =>
      row.name.toLowerCase().includes("golden hour")
    )?.location ?? "Venue TBD";

  return (
    <MarketingDemoTheme>
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="flex min-h-0 flex-col border-r border-line bg-paper-warm">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">Activities</p>
              <p className="text-xs text-stone-cinema">
                {club.orgName} · {club.clock.demoNow.slice(0, 10)}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-md bg-ink px-2.5 py-0.5 text-[11px] font-medium text-paper-warm">
                Published
              </span>
              <span className="rounded-md bg-paper px-2.5 py-0.5 text-[11px] font-medium text-stone-cinema ring-1 ring-line">
                {club.activities.filter((row) => !row.completed).length} upcoming
              </span>
            </div>
          </div>
          <ul className="min-h-0 overflow-y-auto">
            {club.activities.map((activity) => {
              const ops = getActivityOps(club, activity.id);
              const isSelected = activity.id === selectedId;
              return (
                <li
                  key={activity.id}
                  className={cn(
                    "border-b border-line px-4 py-3",
                    isSelected && "bg-gold-soft/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{activity.name}</p>
                      <p className="mt-0.5 text-xs text-stone-cinema">
                        {formatWhen(activity.startsAt, club.clock.timeZoneId)}
                      </p>
                    </div>
                    <ActivityStatusBadge status={activity.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-cinema">
                    <span className="tabular-nums font-medium text-ink">
                      {ops.registered} / {activity.capacity}
                    </span>
                    {ops.spotsLeft != null ? (
                      <span>{ops.spotsLeft} spots left</span>
                    ) : (
                      <span>
                        {ops.checkedIn} checked in · {ops.noShows} no-show
                        {ops.noShows === 1 ? "" : "s"}
                      </span>
                    )}
                    {ops.firstTimers > 0 ? <span>{ops.firstTimers} first-timers</span> : null}
                    {ops.waitlist > 0 ? <span>{ops.waitlist} waitlist</span> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex min-h-0 flex-col bg-paper">
          <div className="border-b border-line px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{selectedOps.activity.name}</p>
                <p className="text-xs text-stone-cinema">
                  {formatWhen(selectedOps.activity.startsAt, club.clock.timeZoneId)} · {venue}
                </p>
              </div>
              <p className="text-right text-sm font-semibold tabular-nums text-ink">
                {selectedOps.registered} / {selectedOps.activity.capacity}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-md bg-paper-warm px-2 py-1 text-stone-cinema ring-1 ring-line">
                {selectedOps.spotsLeft} spots left
              </span>
              <span className="rounded-md bg-paper-warm px-2 py-1 text-stone-cinema ring-1 ring-line">
                {selectedOps.registered} registered
              </span>
              {selectedOps.firstTimers > 0 ? (
                <span className="rounded-md bg-paper-warm px-2 py-1 text-stone-cinema ring-1 ring-line">
                  {selectedOps.firstTimers} first-timers on roster
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-cinema">
              Registrations
            </p>
            <p className="text-xs text-stone-cinema">{selectedOps.registered} people</p>
          </div>
          <ul className="min-h-0 overflow-y-auto">
            {roster.map((client) => (
              <li
                key={client.id}
                className="flex items-center gap-3 border-b border-line px-4 py-2.5"
              >
                <PersonAvatar name={client.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{client.fullName}</p>
                  <p className="truncate text-xs text-stone-cinema">
                    {client.relativeLabel} · {client.leadStatus}
                  </p>
                </div>
                <span className="text-[11px] text-stone-cinema">Registered</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </MarketingDemoTheme>
  );
}
