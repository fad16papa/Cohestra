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
import type { DashboardViewMode } from "@/lib/dashboard-view-mode";
import { cn } from "@/lib/utils";

function pulseStrength(leadCount: number, maxLeads: number): number {
  if (maxLeads <= 0 || leadCount <= 0) {
    return 0.15;
  }

  return 0.25 + (leadCount / maxLeads) * 0.75;
}

export function DashboardCommunityPulse({
  variant = "overview",
}: {
  variant?: DashboardViewMode;
}) {
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

  if (variant === "tables") {
    return (
      <DashboardPanelSection aria-labelledby="community-pulse-heading">
        <DashboardPanelHeader
          headingId="community-pulse-heading"
          title="Community pulse"
          description="Lead volume by community."
          action={
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" aria-hidden />
            </span>
          }
        />
        <div className="overflow-hidden rounded-xl border border-border-warm bg-card/90">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[24rem] text-left text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wide text-text-muted-warm">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium sm:px-5">
                    Community
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium sm:px-5">
                    Leads
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-warm">
                {communities.map((community) => (
                  <tr key={community.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-text-warm sm:px-5">
                      <Link
                        href={`/activities/communities/${community.id}`}
                        className="hover:text-primary"
                      >
                        {community.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-text-warm sm:px-5">
                      {community.leadCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DashboardPanelSection>
    );
  }

  if (variant === "graphs") {
    return (
      <DashboardPanelSection aria-labelledby="community-pulse-heading">
        <DashboardPanelHeader
          headingId="community-pulse-heading"
          title="Community pulse"
          description="Relative lead volume across communities."
          action={
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" aria-hidden />
            </span>
          }
        />
        <div className="space-y-3 rounded-xl border border-border-warm bg-card/90 p-4 sm:p-5">
          <ul className="space-y-3">
            {communities.slice(0, 12).map((community) => {
              const widthPercent = Math.round(pulseStrength(community.leadCount, maxLeads) * 100);
              return (
                <li key={community.id}>
                  <Link
                    href={`/activities/communities/${community.id}`}
                    className="group block rounded-lg px-1 py-1"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-text-warm group-hover:text-primary">
                        {community.name}
                      </span>
                      <span className="shrink-0 tabular-nums font-semibold text-text-warm">
                        {community.leadCount}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </DashboardPanelSection>
    );
  }

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
