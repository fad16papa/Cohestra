"use client";

import { ArrowRight } from "lucide-react";

import { useMarketingCinemaRoll } from "@/components/marketing/marketing-cinema-roll-context";
import { MarketingDemoTheme } from "@/components/marketing/marketing-demo-theme";
import { useMarketingDemoClub } from "@/components/marketing/marketing-demo-provider";
import { PersonAvatar } from "@/components/shared/person-avatar";
import {
  ANCHOR_IDS,
  getIntelligenceBriefs,
} from "@/lib/marketing/marketing-demo-club";
import { cn } from "@/lib/utils";

/**
 * Cohestra AI cinema mount — seed-grounded operator briefs only.
 * Not a chatbot. Every title/why must reverse-chain to DemoClub facts.
 */
export function MarketingDemoIntelligenceMount() {
  const club = useMarketingDemoClub();
  const { beat } = useMarketingCinemaRoll("intelligence");
  const briefs = getIntelligenceBriefs(club);
  const primary = briefs[0];
  const showEvidence = beat >= 1;
  const showAction = beat >= 2;
  const maya = club.clients.find((client) => client.id === ANCHOR_IDS.maya);

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
          {briefs.map((brief, index) => {
            const isPrimary = index === 0;
            const anchors = brief.anchorClientIds
              .map((id) => club.clients.find((client) => client.id === id))
              .filter((client): client is NonNullable<typeof client> => Boolean(client));
            const dimmed = isPrimary ? false : showEvidence && beat >= 1;
            return (
              <li
                key={brief.id}
                className={cn(
                  "marketing-cinema-roll-emphasis rounded-md border border-line bg-paper px-4 py-3",
                  isPrimary && showAction && "border-primary/30 ring-1 ring-primary/15",
                  !isPrimary && dimmed && "opacity-50"
                )}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm font-semibold text-ink">{brief.title}</p>
                  {isPrimary && showAction ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-paper-warm px-2.5 py-1.5 text-[11px] font-medium text-ink">
                      Open Follow-up
                      <ArrowRight className="size-3" aria-hidden />
                    </span>
                  ) : null}
                </div>
                <ul
                  className={cn(
                    "marketing-cinema-roll-panel mt-2 space-y-1.5",
                    isPrimary && showEvidence ? "opacity-100" : isPrimary ? "opacity-70" : "opacity-100"
                  )}
                >
                  {brief.why.map((line) => (
                    <li
                      key={line}
                      className={cn(
                        "text-xs leading-relaxed text-stone-cinema",
                        isPrimary && showEvidence && "text-ink"
                      )}
                    >
                      Why: {line}
                    </li>
                  ))}
                </ul>
                {anchors.length > 0 ? (
                  <div
                    className={cn(
                      "marketing-cinema-roll-panel mt-3 flex flex-wrap gap-2",
                      isPrimary && showEvidence ? "opacity-100" : "opacity-80"
                    )}
                  >
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
                <p
                  className={cn(
                    "marketing-cinema-roll-panel mt-2 text-[11px] text-stone-cinema",
                    isPrimary && showEvidence ? "opacity-100 font-medium text-ink" : "opacity-70"
                  )}
                >
                  Evidence:{" "}
                  {[
                    ...new Set(
                      brief.activityIds.map((id) => {
                        const activity = club.activities.find((row) => row.id === id);
                        if (!activity) {
                          return id;
                        }
                        const when = activity.startsAt.slice(0, 10);
                        return `${activity.name} (${when})`;
                      })
                    ),
                  ].join(" · ")}
                </p>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-line bg-paper px-4 py-2 text-[11px] text-stone-cinema">
          {showAction && primary ? (
            <>
              Recommended: {primary.title}
              {maya ? ` · context ${maya.fullName}` : ""}
            </>
          ) : (
            <>
              Open context: {maya?.fullName ?? "—"} · {maya?.relativeLabel ?? "—"} ·{" "}
              {maya?.leadStatus ?? "—"}
            </>
          )}
        </div>
      </div>
    </MarketingDemoTheme>
  );
}
