"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { EmailDeliveryChecklist } from "@/components/campaigns/email-delivery-checklist";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ProductEmptyState } from "@/components/shared/product-empty-state";
import { UpgradePanel } from "@/components/shell/upgrade-panel";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { buttonVariants } from "@/components/ui/button";
import {
  fetchCampaigns,
  formatCampaignSentAt,
  type CampaignListItem,
} from "@/lib/campaigns-api";
import { isProPlan } from "@/lib/shell/tenant-shell-api";
import { cn } from "@/lib/utils";
import { Mail } from "lucide-react";

function CampaignDeliveredIcon({ count }: { count: number }) {
  if (count > 0) {
    return (
      <span
        className="inline-flex items-center text-emerald-600 dark:text-emerald-400"
        aria-label={`${count} delivered`}
        title={`${count} delivered`}
      >
        <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className="text-text-muted-warm" aria-label="None delivered" title="None delivered">
      —
    </span>
  );
}

function CampaignFailedIcon({ count }: { count: number }) {
  if (count > 0) {
    return (
      <span
        className="inline-flex items-center text-destructive"
        aria-label={`${count} failed`}
        title={`${count} failed`}
      >
        <X className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className="text-text-muted-warm" aria-label="No failures" title="No failures">
      —
    </span>
  );
}

export function CampaignsListPage() {
  const { authFetch } = useAuth();
  const { shell, loading: shellLoading } = useTenantShell();
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const planLocked = shell ? !isProPlan(shell.plan) : false;

  useEffect(() => {
    if (shellLoading || planLocked) {
      return;
    }

    let cancelled = false;

    void fetchCampaigns(authFetch)
      .then((result) => {
        if (!cancelled) {
          setCampaigns(result.items);
          setError(null);
          setInitialized(true);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load campaigns."
          );
          setInitialized(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, planLocked, shellLoading]);

  if (shellLoading) {
    return <ListSkeleton rows={4} />;
  }

  if (planLocked && shell) {
    return (
      <UpgradePanel
        title="Email campaigns are a Pro craft"
        description="Campaigns unlock on Pro — segmented outreach, delivery tracking, and campaign history on client profiles."
        requiredPlan="Pro"
        isTenantAdmin={shell.isTenantAdmin}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Email outreach history and campaign results."
        actions={
          <Link href="/campaigns/new" className={cn(buttonVariants())}>
            New campaign
          </Link>
        }
      />

      <EmailDeliveryChecklist />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!error && initialized && campaigns.length === 0 ? (
        <ProductEmptyState
          icon={Mail}
          title="No campaigns sent yet"
          description="Reach your community with a branded email — segment by activity, preview on desktop and mobile, then send with delivery tracking."
          primaryHref="/campaigns/new"
          primaryLabel="Compose your first campaign"
          secondaryHref="/clients?leadStatus=new"
          secondaryLabel="Review new leads"
        />
      ) : null}

      {!error && campaigns.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border-warm bg-card">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] gap-4 border-b border-border-warm bg-muted/30 px-4 py-3 text-xs font-medium uppercase tracking-wide text-text-muted-warm">
            <span>Subject</span>
            <span>Sent</span>
            <span>Delivered</span>
            <span>Failed</span>
          </div>
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] gap-4 border-b border-border-warm px-4 py-4 text-sm transition-colors last:border-b-0 hover:bg-muted/40"
            >
              <span className="truncate font-medium text-text-warm">
                {campaign.subject}
              </span>
              <span className="text-text-muted-warm">
                {formatCampaignSentAt(campaign.sentAt)}
              </span>
              <span className="flex items-center">
                <CampaignDeliveredIcon count={campaign.sentCount} />
              </span>
              <span className="flex items-center">
                <CampaignFailedIcon count={campaign.failedCount} />
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {!error && !initialized ? <ListSkeleton rows={4} /> : null}
    </div>
  );
}
