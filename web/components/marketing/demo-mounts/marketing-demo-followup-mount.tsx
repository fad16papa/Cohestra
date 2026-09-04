"use client";

import { LeadStatusBadge } from "@/components/clients/lead-status-badge";
import { TimelineEvent } from "@/components/clients/timeline-event";
import { MarketingDemoTheme } from "@/components/marketing/marketing-demo-theme";
import { useMarketingDemoClub } from "@/components/marketing/marketing-demo-provider";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { WhatsAppBrandIcon } from "@/components/shared/messenger-brand-icons";
import {
  ANCHOR_IDS,
  canRecommendWhatsApp,
  countNeedAttention,
  formatDemoWhatsappDay,
  getClientDetail,
  getFollowUpClient,
  getTriageBucket,
  listClientsByTriage,
  type DemoTriageBucket,
} from "@/lib/marketing/marketing-demo-club";
import { cn } from "@/lib/utils";

const BUCKET_LABEL: Record<Exclude<DemoTriageBucket, "healthy">, string> = {
  dueNow: "Due now",
  atRisk: "At risk",
  opportunity: "Opportunity",
};

export function MarketingDemoFollowupMount() {
  const club = useMarketingDemoClub();
  const attention = countNeedAttention(club);
  const selected = getFollowUpClient(club);
  const detail = getClientDetail(club, selected.id);
  const selectedBucket = getTriageBucket(club, selected.id);
  const whatsappDay = formatDemoWhatsappDay(
    club.whatsappQuote.loggedAt,
    club.clock.timeZoneId
  );
  const dueNow = listClientsByTriage(club, "dueNow");
  const atRisk = listClientsByTriage(club, "atRisk");
  const opportunity = listClientsByTriage(club, "opportunity");
  const queue = [...dueNow, ...atRisk, ...opportunity];
  const proofAnchors: Array<{
    id: string;
    label: string;
    client: (typeof club.clients)[number];
  }> = [];
  for (const row of [
    { id: ANCHOR_IDS.maya, label: "Due today" },
    { id: ANCHOR_IDS.daniel, label: "At risk" },
    { id: ANCHOR_IDS.priya, label: "Opportunity" },
  ] as const) {
    const client = club.clients.find((item) => item.id === row.id);
    if (client) {
      proofAnchors.push({ id: row.id, label: row.label, client });
    }
  }

  return (
    <MarketingDemoTheme>
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex min-h-0 flex-col border-r border-line bg-paper-warm">
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Follow-up</p>
            <p className="text-xs text-stone-cinema">
              Needs attention {attention.total} · Healthy kept separate
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(
                [
                  ["dueNow", attention.dueNow],
                  ["atRisk", attention.atRisk],
                  ["opportunity", attention.opportunity],
                ] as const
              ).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-md bg-paper px-2.5 py-2 ring-1 ring-line"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-stone-cinema">
                    {BUCKET_LABEL[key]}
                  </p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <ul className="min-h-0 overflow-y-auto">
            {queue.map((client) => {
              const bucket = getTriageBucket(club, client.id);
              const isSelected = client.id === selected.id;
              const waOk = canRecommendWhatsApp(club, client.id);
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
                      {bucket !== "healthy" ? BUCKET_LABEL[bucket] : "Healthy"} ·{" "}
                      {client.lastActivityName ?? "No activity"}
                      {!waOk ? " · phone missing" : ""}
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
                  {selectedBucket !== "healthy"
                    ? BUCKET_LABEL[selectedBucket]
                    : "Healthy"}{" "}
                  · {detail.notes ?? "No notes"}
                </p>
              </div>
            </div>
            <LeadStatusBadge status={detail.leadStatus} />
          </div>
          <div className="border-b border-line px-4 py-3">
            <div className="rounded-md border border-line bg-paper-warm px-3 py-3">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
                <WhatsAppBrandIcon className="text-whatsapp" />
                WhatsApp · team log
              </p>
              <p className="mt-2 text-sm text-ink">{club.whatsappQuote.body}</p>
              <p className="mt-2 text-xs text-stone-cinema">
                {whatsappDay} · {canRecommendWhatsApp(club, selected.id) ? "sendable" : "blocked"}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {proofAnchors.map(({ client, label }) => (
                <div
                  key={client.id}
                  className={cn(
                    "rounded-md px-2 py-2 ring-1 ring-line",
                    client.id === selected.id ? "bg-gold-soft/50" : "bg-paper-warm"
                  )}
                >
                  <p className="truncate text-[10px] font-medium uppercase tracking-wide text-stone-cinema">
                    {label}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-ink">{client.fullName}</p>
                </div>
              ))}
            </div>
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
