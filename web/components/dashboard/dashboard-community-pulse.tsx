"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  DASHBOARD_PANEL_VISIBLE_ITEMS,
  DashboardMatchedPanel,
  DashboardPanelHeader,
  DashboardPanelSection,
} from "@/components/dashboard/dashboard-matched-panel";
import { buttonVariants } from "@/components/ui/button";
import { fetchCommunities, type CommunityListItem } from "@/lib/communities-api";
import { cn } from "@/lib/utils";

function pulseStrength(leadCount: number, maxLeads: number): number {
  if (maxLeads <= 0 || leadCount <= 0) {
    return 0.15;
  }

  return 0.25 + (leadCount / maxLeads) * 0.75;
}

export function DashboardCommunityPulse() {
  const { authFetch } = useAuth();
  const [communities, setCommunities] = useState<CommunityListItem[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetchCommunities(authFetch)
      .then((items) => {
        if (!cancelled) {
          setCommunities(
            items
              .filter((item) => item.leadCount > 0)
              .sort((a, b) => b.leadCount - a.leadCount)
          );
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  const maxLeads = useMemo(
    () => Math.max(...communities.map((item) => item.leadCount), 1),
    [communities]
  );

  if (error || communities.length === 0) {
    return null;
  }

  const hasMore = communities.length > DASHBOARD_PANEL_VISIBLE_ITEMS;

  return (
    <DashboardPanelSection aria-labelledby="community-pulse-heading">
      <DashboardPanelHeader
        headingId="community-pulse-heading"
        title="Community pulse"
        description="Where your community energy is strongest right now."
        action={
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="size-5" aria-hidden />
          </span>
        }
      />

      <DashboardMatchedPanel
        itemCount={communities.length}
        scrollAriaLabel={`Community pulse rankings. ${hasMore ? `Showing top ${DASHBOARD_PANEL_VISIBLE_ITEMS}; scroll for more.` : `${communities.length} communities.`}`}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {hasMore ? (
              <p className="text-xs text-text-muted-warm">
                Showing top {DASHBOARD_PANEL_VISIBLE_ITEMS} of {communities.length} —
                scroll the list for more.
              </p>
            ) : (
              <p className="text-xs text-text-muted-warm">
                Bar length reflects relative lead volume across your communities.
              </p>
            )}
            <Link
              href="/activities/communities"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "inline-flex h-8 shrink-0 items-center gap-1 self-start px-2 text-text-muted-warm hover:text-text-warm sm:self-auto"
              )}
            >
              View communities
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        }
      >
        <ul className="divide-y divide-border-warm">
          {communities.map((community) => {
            const strength = pulseStrength(community.leadCount, maxLeads);
            const widthPercent = Math.round(strength * 100);

            return (
              <li key={community.id}>
                <Link
                  href={`/activities/communities/${community.id}`}
                  className="group flex min-h-[var(--dashboard-panel-row-height,4.5rem)] flex-col justify-center px-3 py-2.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-4"
                >
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span
                      className="truncate font-medium text-text-warm group-hover:text-primary"
                      title={community.name}
                    >
                      {community.name}
                    </span>
                    <span className="shrink-0 text-xs text-text-muted-warm sm:text-sm">
                      {community.leadCount} lead{community.leadCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/60 sm:mt-2 sm:h-2">
                    <div
                      className={cn(
                        "h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700",
                        "motion-safe:animate-pulse"
                      )}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </DashboardMatchedPanel>
    </DashboardPanelSection>
  );
}
