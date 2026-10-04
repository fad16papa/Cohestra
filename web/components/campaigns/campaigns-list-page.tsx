"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { CampaignRoomChrome } from "@/components/campaigns/campaign-room-gate";
import { EmailDeliveryChecklist } from "@/components/campaigns/email-delivery-checklist";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ProductEmptyState } from "@/components/shared/product-empty-state";
import { ProductErrorState } from "@/components/shared/product-error-state";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  campaignFetchDenial,
  resolveCampaignRoomAccess,
} from "@/lib/campaign-room-access";
import { campaignStatusLabel } from "@/lib/campaign-html";
import {
  fetchCampaigns,
  formatCampaignSentAt,
  type CampaignListItem,
  type CampaignListResult,
} from "@/lib/campaigns-api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

export function CampaignsListPage() {
  const { authFetch } = useAuth();
  const { shell, loading: shellLoading } = useTenantShell();
  const access = resolveCampaignRoomAccess(shell, shellLoading);
  const [result, setResult] = useState<CampaignListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [planLocked, setPlanLocked] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);

  const retry = useCallback(() => {
    setInitialized(false);
    setError(null);
    setDenied(false);
    setPlanLocked(false);
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    if (access.kind !== "open") {
      return;
    }

    let cancelled = false;

    void fetchCampaigns(authFetch, { page, pageSize: PAGE_SIZE })
      .then((next) => {
        if (!cancelled) {
          setResult(next);
          setError(null);
          setDenied(false);
          setPlanLocked(false);
          setInitialized(true);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          const denial = campaignFetchDenial(loadError);
          setResult(null);
          setDenied(denial.denied);
          setPlanLocked(denial.planLocked);
          setError(denial.message);
          setInitialized(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [access.kind, authFetch, page, reloadToken]);

  const campaigns = result?.items ?? [];
  const totalCount = result?.totalCount ?? 0;
  const pageSize = result?.pageSize ?? PAGE_SIZE;
  const canPage = totalCount > pageSize;
  const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <CampaignRoomChrome
      title="Campaigns"
      description="Email outreach history and campaign results."
      access={access}
      denied={denied}
      deniedMessage={error ?? undefined}
      planLockedOverride={planLocked}
      isTenantAdmin={shell?.isTenantAdmin === true}
    >
      <div className="space-y-6">
        <PageHeader
          title="Campaigns"
          description="Email outreach history and campaign results."
          actions={
            <Link
              href="/campaigns/new"
              className={cn(buttonVariants(), "h-12 min-h-12 min-w-11 px-4")}
            >
              New campaign
            </Link>
          }
        />

        <EmailDeliveryChecklist />

        {error && !denied && !planLocked ? (
          <ProductErrorState
            title="Could not load campaigns"
            message={error}
            onRetry={retry}
          />
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
            <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,1fr)] gap-4 border-b border-border-warm bg-muted/30 px-4 py-3 text-xs font-medium uppercase tracking-wide text-text-warm sm:grid">
              <span>Subject</span>
              <span>Sent</span>
              <span>Status</span>
              <span>Results</span>
            </div>
            {campaigns.map((campaign) => (
              <CampaignListRow key={campaign.id} campaign={campaign} />
            ))}
          </div>
        ) : null}

        {canPage ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted-warm" role="status">
              Page {page} of {maxPage} · {totalCount} campaigns
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 min-w-11 px-4"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-12 min-w-11 px-4"
                disabled={page >= maxPage}
                onClick={() => setPage((current) => Math.min(maxPage, current + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}

        {!error && !initialized ? <ListSkeleton rows={4} /> : null}
      </div>
    </CampaignRoomChrome>
  );
}

function CampaignListRow({ campaign }: { campaign: CampaignListItem }) {
  const status = campaignStatusLabel(campaign.status);
  const results = `${campaign.sentCount} sent · ${campaign.failedCount} failed · ${campaign.skippedCount} skipped`;

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="grid gap-2 border-b border-border-warm px-4 py-4 text-sm motion-press last:border-b-0 hover:bg-muted/40 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,1fr)] sm:items-center sm:gap-4"
    >
      <span className="truncate font-medium text-text-warm">{campaign.subject}</span>
      <span className="text-text-warm">{formatCampaignSentAt(campaign.sentAt)}</span>
      <span className="text-text-warm">{status}</span>
      <span className="text-text-warm">{results}</span>
    </Link>
  );
}
