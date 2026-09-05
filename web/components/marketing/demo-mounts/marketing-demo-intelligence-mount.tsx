"use client";

import { MarketingDemoTheme } from "@/components/marketing/marketing-demo-theme";
import { useMarketingDemoClub } from "@/components/marketing/marketing-demo-provider";
import { PersonAvatar } from "@/components/shared/person-avatar";
import {
  getIntelligenceBriefs,
  getSelectedClient,
} from "@/lib/marketing/marketing-demo-club";

/**
 * Cohestra AI cinema mount — seed-grounded operator briefs only.
 * Not a chatbot. Every title/why must reverse-chain to DemoClub facts.
 */
export function MarketingDemoIntelligenceMount() {
  const club = useMarketingDemoClub();
  const briefs = getIntelligenceBriefs(club);
  const selected = getSelectedClient(club);

  return (
    <MarketingDemoTheme>
      <div className="flex h-full min-h-0 flex-col bg-paper-warm">
        <div className="border-b border-line bg-paper px-4 py-3">
          <p className="text-sm font-semibold text-ink">Cohestra AI</p>
          <p className="text-xs text-stone-cinema">
            Operator brief · {club.orgName} · {club.clock.timeZoneId}
          </p>
        </div>
        <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {briefs.map((brief) => {
            const anchors = brief.anchorClientIds
              .map((id) => club.clients.find((client) => client.id === id))
              .filter((client): client is NonNullable<typeof client> => Boolean(client));
            return (
              <li key={brief.id} className="rounded-md border border-line bg-paper px-4 py-3">
                <p className="text-sm font-semibold text-ink">{brief.title}</p>
                <ul className="mt-2 space-y-1.5">
                  {brief.why.map((line) => (
                    <li key={line} className="text-xs leading-relaxed text-stone-cinema">
                      Why: {line}
                    </li>
                  ))}
                </ul>
                {anchors.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {anchors.map((client) => (
                      <span
                        key={client.id}
                        className="inline-flex items-center gap-1.5 rounded-md bg-paper-warm px-2 py-1 text-[11px] text-ink ring-1 ring-line"
                      >
                        <PersonAvatar name={client.fullName} size="sm" />
                        {client.fullName}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="mt-2 text-[11px] text-stone-cinema">
                  Evidence:{" "}
                  {brief.activityIds
                    .map(
                      (id) =>
                        club.activities.find((activity) => activity.id === id)?.name ?? id
                    )
                    .join(" · ")}
                </p>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-line bg-paper px-4 py-2 text-[11px] text-stone-cinema">
          Open context: {selected.fullName} · {selected.relativeLabel} · {selected.leadStatus}
        </div>
      </div>
    </MarketingDemoTheme>
  );
}
