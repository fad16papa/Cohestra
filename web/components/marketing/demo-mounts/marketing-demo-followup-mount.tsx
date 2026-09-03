"use client";

import { LeadStatusBadge } from "@/components/clients/lead-status-badge";
import { TimelineEvent } from "@/components/clients/timeline-event";
import { MarketingDemoTheme } from "@/components/marketing/marketing-demo-theme";
import { useMarketingDemoClub } from "@/components/marketing/marketing-demo-provider";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { WhatsAppBrandIcon } from "@/components/shared/messenger-brand-icons";
import {
  formatDemoWhatsappDay,
  getClientDetail,
  getFollowUpClient,
} from "@/lib/marketing/marketing-demo-club";

export function MarketingDemoFollowupMount() {
  const club = useMarketingDemoClub();
  const jordan = getFollowUpClient(club);
  const detail = getClientDetail(club, jordan.id);
  const whatsappDay = formatDemoWhatsappDay(club.whatsappQuote.loggedAt);

  return (
    <MarketingDemoTheme>
      <div className="flex h-full min-h-0 flex-col bg-paper">
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <PersonAvatar name={detail.fullName} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{detail.fullName}</p>
              <p className="text-xs text-stone-cinema">
                {detail.nationality} · Needs follow-up
              </p>
            </div>
          </div>
          <LeadStatusBadge status={detail.leadStatus} />
        </div>
        <div className="border-b border-line px-4 py-3">
          <div className="rounded-xl border border-line bg-paper-warm px-3 py-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
              <WhatsAppBrandIcon className="text-whatsapp" />
              WhatsApp
            </p>
            <p className="mt-2 text-sm text-ink">{club.whatsappQuote.body}</p>
            <p className="mt-2 text-xs text-stone-cinema">
              {whatsappDay} · visible to the whole team
            </p>
          </div>
        </div>
        <div className="min-h-0 px-3 py-2">
          {detail.timeline.map((item, index) => (
            <TimelineEvent key={`${item.eventType}-${item.occurredAt}-${index}`} item={item} />
          ))}
        </div>
      </div>
    </MarketingDemoTheme>
  );
}
