"use client";

import { LeadStatusBadge } from "@/components/clients/lead-status-badge";
import { TimelineEvent } from "@/components/clients/timeline-event";
import { MarketingDemoTheme } from "@/components/marketing/marketing-demo-theme";
import { useMarketingDemoClub } from "@/components/marketing/marketing-demo-provider";
import { PersonAvatar } from "@/components/shared/person-avatar";
import {
  WhatsAppBrandIcon,
  ViberBrandIcon,
} from "@/components/shared/messenger-brand-icons";
import {
  canRecommendWhatsApp,
  clientMetaLine,
  getClientDetail,
  getSelectedClient,
  getTriageBucket,
} from "@/lib/marketing/marketing-demo-club";
import { leadStatusLabels } from "@/lib/clients-api";
import { cn } from "@/lib/utils";

function nextActionLabel(
  club: ReturnType<typeof useMarketingDemoClub>,
  clientId: string
): string {
  const bucket = getTriageBucket(club, clientId);
  const detail = club.clientDetails[clientId];
  if (bucket === "dueNow") {
    return canRecommendWhatsApp(club, clientId)
      ? "WhatsApp today"
      : "Call / email — phone missing";
  }
  if (bucket === "atRisk") {
    return "Re-engage · quiet 21+ days";
  }
  if (bucket === "opportunity") {
    return "Invite to next session";
  }
  if (detail?.nextFollowUpAt) {
    return `Follow-up ${detail.nextFollowUpAt.slice(0, 10)}`;
  }
  return "Monitor";
}

export function MarketingDemoClientsMount() {
  const club = useMarketingDemoClub();
  const selected = getSelectedClient(club);
  const detail = getClientDetail(club, selected.id);

  return (
    <MarketingDemoTheme>
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="flex min-h-0 flex-col border-r border-line bg-paper-warm">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">Clients</p>
              <p className="text-xs text-stone-cinema">{club.clientListTotalCount} people</p>
            </div>
            <div className="rounded-md border border-line bg-paper px-2.5 py-1 text-xs text-stone-cinema">
              Search name, phone, source
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2">
            {["All", "New", "Contacted", "Active", "Inactive"].map((chip) => (
              <span
                key={chip}
                className={cn(
                  "rounded-md px-2.5 py-0.5 text-[11px] font-medium",
                  chip === "All"
                    ? "bg-ink text-paper-warm"
                    : "bg-paper text-stone-cinema ring-1 ring-line"
                )}
              >
                {chip}
              </span>
            ))}
          </div>
          <ul className="min-h-0 overflow-y-auto">
            {club.clients.map((client) => {
              const isSelected = client.id === selected.id;
              const rowDetail = club.clientDetails[client.id];
              return (
                <li
                  key={client.id}
                  className={cn(
                    "flex items-center gap-3 border-b border-line px-4 py-2.5",
                    isSelected && "bg-gold-soft/40"
                  )}
                >
                  <PersonAvatar name={client.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{client.fullName}</p>
                    <p className="truncate text-xs text-stone-cinema">
                      {clientMetaLine(client)}
                      {rowDetail?.referralSource ? ` · ${rowDetail.referralSource}` : ""}
                    </p>
                  </div>
                  <LeadStatusBadge status={client.leadStatus} />
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex min-h-0 flex-col bg-paper">
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <PersonAvatar name={detail.fullName} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{detail.fullName}</p>
                <p className="text-xs text-stone-cinema">
                  {detail.email ?? "No email"} · {detail.phone ?? "No phone"}
                </p>
                <p className="mt-1 text-xs text-stone-cinema">
                  {detail.nationality ?? "—"} · {leadStatusLabels[detail.leadStatus]} ·{" "}
                  {detail.referralSource ?? "Source unknown"}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <span
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-full",
                  canRecommendWhatsApp(club, selected.id)
                    ? "bg-whatsapp/15 text-whatsapp"
                    : "bg-paper-warm text-stone-cinema opacity-40"
                )}
                title={
                  canRecommendWhatsApp(club, selected.id)
                    ? "WhatsApp"
                    : "WhatsApp blocked — phone missing"
                }
              >
                <WhatsAppBrandIcon />
              </span>
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-viber/15 text-viber">
                <ViberBrandIcon />
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 border-b border-line px-4 py-3 text-xs">
            <div className="rounded-md bg-paper-warm px-3 py-2 ring-1 ring-line">
              <p className="text-stone-cinema">Next action</p>
              <p className="mt-0.5 font-medium text-ink">{nextActionLabel(club, selected.id)}</p>
            </div>
            <div className="rounded-md bg-paper-warm px-3 py-2 ring-1 ring-line">
              <p className="text-stone-cinema">Notes</p>
              <p className="mt-0.5 line-clamp-2 font-medium text-ink">
                {detail.notes ?? "No notes yet"}
              </p>
            </div>
          </div>
          <div className="border-b border-line px-4 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-stone-cinema">
              Activity history
            </p>
            <ul className="mt-1 space-y-1">
              {detail.registrationHistory.slice(0, 4).map((row) => (
                <li
                  key={row.registrationId}
                  className="flex justify-between gap-2 text-xs text-stone-cinema"
                >
                  <span className="truncate text-ink">{row.activityName}</span>
                  <span className="shrink-0 tabular-nums">{row.registeredAt.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-h-0 overflow-y-auto px-3 py-2">
            {detail.timeline.map((item, index) => (
              <TimelineEvent key={`${item.eventType}-${item.occurredAt}-${index}`} item={item} />
            ))}
          </div>
        </div>
      </div>
    </MarketingDemoTheme>
  );
}
