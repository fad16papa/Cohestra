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
import { clientMetaLine, getClientDetail, getSelectedClient } from "@/lib/marketing/marketing-demo-club";
import { leadStatusLabels } from "@/lib/clients-api";
import { cn } from "@/lib/utils";

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
              <p className="text-xs text-stone-cinema">{club.clientListTotalCount}</p>
            </div>
            <div className="rounded-md border border-line bg-paper px-2.5 py-1 text-xs text-stone-cinema">
              Search by name or nationality
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2">
            {["All", "New", "Contacted", "Active"].map((chip) => (
              <span
                key={chip}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                  chip === "All"
                    ? "bg-ink text-paper-warm"
                    : "bg-paper text-stone-cinema ring-1 ring-line"
                )}
              >
                {chip}
              </span>
            ))}
          </div>
          <ul className="min-h-0">
            {club.clients.map((client) => {
              const isSelected = client.id === selected.id;
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
                    <p className="truncate text-xs text-stone-cinema">{clientMetaLine(client)}</p>
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
                  {detail.email} · {detail.phone}
                </p>
                <p className="mt-1 text-xs text-stone-cinema">
                  {detail.nationality} · {leadStatusLabels[detail.leadStatus]}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-whatsapp/15 text-whatsapp">
                <WhatsAppBrandIcon />
              </span>
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-viber/15 text-viber">
                <ViberBrandIcon />
              </span>
            </div>
          </div>
          <div className="min-h-0 px-3 py-2">
            {detail.timeline.map((item, index) => (
              <TimelineEvent key={`${item.eventType}-${item.occurredAt}-${index}`} item={item} />
            ))}
          </div>
        </div>
      </div>
    </MarketingDemoTheme>
  );
}
