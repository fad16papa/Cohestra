"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, MailX, Timer, XCircle } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { CampaignRoomChrome } from "@/components/campaigns/campaign-room-gate";
import { PageHeader } from "@/components/shared/page-header";
import { ProductErrorState } from "@/components/shared/product-error-state";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { buttonVariants } from "@/components/ui/button";
import {
  campaignFetchDenial,
  resolveCampaignRoomAccess,
} from "@/lib/campaign-room-access";
import {
  campaignResultSummary,
  campaignStatusLabel,
  isCampaignInFlight,
  sanitizeCampaignHtml,
} from "@/lib/campaign-html";
import {
  fetchCampaignById,
  formatCampaignSentAt,
  type CampaignDetail,
  type CampaignRecipientResult,
} from "@/lib/campaigns-api";
import { cn } from "@/lib/utils";

type CampaignDetailPageProps = {
  id: string;
};

const RECIPIENT_VISIBLE_ROWS = 20;
const RECIPIENT_ROW_HEIGHT_PX = 52;
const recipientListMaxHeightPx = RECIPIENT_VISIBLE_ROWS * RECIPIENT_ROW_HEIGHT_PX;

function RecipientStatusBadge({ status }: { status: CampaignRecipientResult["status"] }) {
  if (status === "queued") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
        <Timer className="size-3" aria-hidden />
        Queued
      </span>
    );
  }

  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-success px-2 py-0.5 text-xs font-medium text-foreground">
        <CheckCircle2 className="size-3" aria-hidden />
        Sent
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
        <XCircle className="size-3" aria-hidden />
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-warning px-2 py-0.5 text-xs font-medium text-foreground">
      <MailX className="size-3" aria-hidden />
      Skipped
    </span>
  );
}

export function CampaignDetailPage({ id }: CampaignDetailPageProps) {
  const { authFetch } = useAuth();
  const { shell, loading: shellLoading } = useTenantShell();
  const access = resolveCampaignRoomAccess(shell, shellLoading);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [planLocked, setPlanLocked] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setDenied(false);
    setPlanLocked(false);
    setCampaign(null);
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    if (access.kind !== "open") {
      return;
    }

    let cancelled = false;
    let timer: number | undefined;
    const deadline = Date.now() + 60_000;

    async function load() {
      try {
        const result = await fetchCampaignById(authFetch, id);
        if (cancelled) {
          return;
        }

        setCampaign(result);
        setError(null);
        setDenied(false);
        setPlanLocked(false);

        if (isCampaignInFlight(result.status) && Date.now() < deadline) {
          timer = window.setTimeout(() => {
            void load();
          }, 1500);
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        const denial = campaignFetchDenial(loadError);
        setDenied(denial.denied);
        setPlanLocked(denial.planLocked);
        setError(denial.message);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [access.kind, authFetch, id, reloadToken]);

  return (
    <CampaignRoomChrome
      title={campaign?.subject ?? "Campaign"}
      description={campaign ? `Sent ${formatCampaignSentAt(campaign.sentAt)}` : "Campaign detail"}
      access={access}
      denied={denied}
      deniedMessage={error ?? undefined}
      planLockedOverride={planLocked}
      isTenantAdmin={shell?.isTenantAdmin === true}
    >
      {error && !denied && !planLocked ? (
        <div className="space-y-4">
          <Link
            href="/campaigns"
            className={cn(buttonVariants({ variant: "outline" }), "min-h-12 min-w-11 px-4")}
          >
            Back to campaigns
          </Link>
          <PageHeader title="Campaign" />
          <ProductErrorState
            title="Could not load campaign"
            message={error}
            onRetry={retry}
            backHref="/campaigns"
            backLabel="Back to campaigns"
          />
        </div>
      ) : null}

      {!error && !campaign ? (
        <div className="space-y-4">
          <PageHeader title="Campaign" description="Loading campaign…" />
        </div>
      ) : null}

      {campaign ? (
        <CampaignDetailBody campaign={campaign} />
      ) : null}
    </CampaignRoomChrome>
  );
}

function CampaignDetailBody({ campaign }: { campaign: CampaignDetail }) {
  const recipientCount = campaign.results.length;
  const safeHtml = sanitizeCampaignHtml(campaign.body);

  return (
    <div className="space-y-6">
      <div>
        <PageHeader
          eyebrow={
            <Link
              href="/campaigns"
              className="inline-flex min-h-12 items-center text-sm font-medium normal-case tracking-normal text-text-muted-warm motion-press hover:text-text-warm"
            >
              ← Back to campaigns
            </Link>
          }
          title={campaign.subject}
          description={`${campaignStatusLabel(campaign.status)} · ${formatCampaignSentAt(campaign.sentAt)} · ${campaign.sentCount} sent · ${campaign.failedCount} failed · ${campaign.skippedCount} skipped · ${recipientCount} recipient${recipientCount === 1 ? "" : "s"}`}
        />
      </div>

      <p role="status" className="text-sm text-text-muted-warm">
        {campaignResultSummary(campaign)}
      </p>

      <div className="space-y-6">
        <div className="min-w-0 rounded-xl border border-border-warm bg-card p-4">
          <h2 className="text-sm font-semibold text-text-warm">Message</h2>
          {campaign.bodyFormat === "html" ? (
            <div
              className="mt-3 max-w-full overflow-x-auto text-sm leading-relaxed break-words text-text-muted-warm [&_a]:text-text-link [&_a]:underline [&_img]:my-3 [&_img]:max-h-80 [&_img]:max-w-full [&_img]:rounded-lg [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
          ) : (
            <p className="mt-3 whitespace-pre-wrap text-sm text-text-muted-warm">{campaign.body}</p>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-border-warm bg-card">
          <div className="border-b border-border-warm bg-muted/20 px-4 py-3">
            <h2 className="text-sm font-semibold text-text-warm">Recipients</h2>
            <p className="mt-1 text-xs text-text-muted-warm">
              Everyone targeted by this campaign and their delivery outcome.
              {recipientCount > RECIPIENT_VISIBLE_ROWS
                ? ` Showing ${RECIPIENT_VISIBLE_ROWS} at a time — scroll for more.`
                : null}
            </p>
          </div>

          {recipientCount === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-muted-warm">
              No recipient records for this campaign.
            </p>
          ) : (
            <div className="overflow-hidden">
              <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] gap-3 border-b border-border-warm bg-muted/30 px-4 py-2 text-xs font-medium tracking-wide text-text-muted-warm uppercase sm:grid">
                <span>Name</span>
                <span>Email</span>
                <span className="text-right">Status</span>
              </div>
              <ul
                className={cn(
                  "divide-y divide-border-warm",
                  recipientCount > RECIPIENT_VISIBLE_ROWS && "overflow-y-auto"
                )}
                style={
                  recipientCount > RECIPIENT_VISIBLE_ROWS
                    ? { maxHeight: recipientListMaxHeightPx }
                    : undefined
                }
              >
                {campaign.results.map((recipient) => {
                  const hasEmail = Boolean(recipient.email?.trim());

                  return (
                    <li
                      key={recipient.clientId}
                      className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] sm:items-start sm:gap-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/clients/${recipient.clientId}`}
                          className="inline-flex min-h-12 items-center truncate text-sm font-medium text-text-warm motion-press hover:text-text-link"
                        >
                          {recipient.fullName}
                        </Link>
                        {recipient.failureReason ? (
                          <p className="mt-0.5 text-xs text-text-muted-warm">
                            {recipient.failureReason}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          "min-w-0 truncate text-sm",
                          hasEmail ? "text-text-muted-warm" : "text-text-warning"
                        )}
                      >
                        {hasEmail ? recipient.email : "No email on file"}
                      </span>
                      <span className="sm:text-right">
                        <RecipientStatusBadge status={recipient.status} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
