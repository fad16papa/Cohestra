"use client";

import { MarketingDemoTheme } from "@/components/marketing/marketing-demo-theme";
import { useMarketingDemoClub } from "@/components/marketing/marketing-demo-provider";
import { formatCampaignSentAt } from "@/lib/campaigns-api";

export function MarketingDemoCampaignsMount() {
  const club = useMarketingDemoClub();

  return (
    <MarketingDemoTheme>
      <div className="flex h-full min-h-0 flex-col bg-paper-warm p-3">
        <div className="mb-3">
          <p className="text-sm font-semibold text-ink">Campaigns</p>
          <p className="text-xs text-stone-cinema">Sunday clinic regulars · {club.orgName}</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-line bg-paper">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.6fr)_minmax(0,0.6fr)] gap-4 border-b border-line bg-paper-warm px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-cinema">
            <span>Subject</span>
            <span>Sent</span>
            <span>Recipients</span>
            <span>Failed</span>
          </div>
          {club.campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.6fr)_minmax(0,0.6fr)] gap-4 border-b border-line px-4 py-4 text-sm last:border-b-0"
            >
              <span className="truncate font-medium text-ink">{campaign.subject}</span>
              <span className="text-stone-cinema">{formatCampaignSentAt(campaign.sentAt)}</span>
              <span className="tabular-nums text-ink">{campaign.sentCount}</span>
              <span className="tabular-nums text-ink">{campaign.failedCount}</span>
            </div>
          ))}
        </div>
      </div>
    </MarketingDemoTheme>
  );
}
