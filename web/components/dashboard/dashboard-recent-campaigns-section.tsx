"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  fetchCampaigns,
  formatCampaignSentAt,
  type CampaignListItem,
} from "@/lib/campaigns-api";
import { cn } from "@/lib/utils";

function CampaignDeliveredIcon({ count }: { count: number }) {
  if (count > 0) {
    return (
      <span className="inline-flex text-emerald-600 dark:text-emerald-400" title={`${count} delivered`}>
        <Check className="size-4" strokeWidth={2.5} aria-hidden />
      </span>
    );
  }

  return <span className="text-text-muted-warm">—</span>;
}

function CampaignFailedIcon({ count }: { count: number }) {
  if (count > 0) {
    return (
      <span className="inline-flex text-destructive" title={`${count} failed`}>
        <X className="size-4" strokeWidth={2.5} aria-hidden />
      </span>
    );
  }

  return <span className="text-text-muted-warm">—</span>;
}

export function DashboardRecentCampaignsSection() {
  const { authFetch, status } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    void fetchCampaigns(authFetch, { page: 1, pageSize: 5 })
      .then((result) => {
        if (!cancelled) {
          setCampaigns(result.items);
          setInitialized(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCampaigns([]);
          setInitialized(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, status]);

  return (
    <section aria-labelledby="recent-campaigns-heading" className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 id="recent-campaigns-heading" className="text-section text-text-warm">
            Recent campaigns
          </h3>
          <p className="mt-1 text-sm text-text-muted-warm">
            Latest outreach sends and delivery outcomes.
          </p>
        </div>
        <Link
          href="/campaigns"
          className="text-sm font-medium text-primary hover:text-primary/80"
        >
          View all campaigns
        </Link>
      </div>

      {!initialized ? (
        <p className="text-sm text-text-muted-warm">Loading recent campaigns…</p>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-warm px-6 py-10 text-center text-sm text-text-muted-warm">
          No campaigns sent yet.{" "}
          <Link href="/campaigns/new" className="font-medium text-primary hover:underline">
            Compose your first campaign
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-warm bg-card">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_auto_auto] gap-4 border-b border-border-warm bg-muted/30 px-4 py-3 text-xs font-medium uppercase tracking-wide text-text-muted-warm">
            <span>Subject</span>
            <span>Sent</span>
            <span>Delivered</span>
            <span>Failed</span>
          </div>
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className={cn(
                "grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_auto_auto] gap-4 border-b border-border-warm px-4 py-3 text-sm",
                "transition-colors last:border-b-0 hover:bg-muted/40"
              )}
            >
              <span className="truncate font-medium text-text-warm">{campaign.subject}</span>
              <span className="text-text-muted-warm">{formatCampaignSentAt(campaign.sentAt)}</span>
              <span className="flex items-center">
                <CampaignDeliveredIcon count={campaign.sentCount} />
              </span>
              <span className="flex items-center">
                <CampaignFailedIcon count={campaign.failedCount} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
