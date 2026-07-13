"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, MailX, XCircle } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { buttonVariants } from "@/components/ui/button";
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

/** Show this many recipient rows before the list scrolls. */
const RECIPIENT_VISIBLE_ROWS = 20;
/** Approximate row height including vertical padding (px). */
const RECIPIENT_ROW_HEIGHT_PX = 52;
const recipientListMaxHeightPx = RECIPIENT_VISIBLE_ROWS * RECIPIENT_ROW_HEIGHT_PX;

function RecipientStatusBadge({ status }: { status: CampaignRecipientResult["status"] }) {
  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
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
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
      <MailX className="size-3" aria-hidden />
      Skipped
    </span>
  );
}

export function CampaignDetailPage({ id }: CampaignDetailPageProps) {
  const { authFetch } = useAuth();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchCampaignById(authFetch, id)
      .then((result) => {
        if (!cancelled) {
          setCampaign(result);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Could not load campaign."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, id]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/campaigns" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to campaigns
        </Link>
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      </div>
    );
  }

  if (!campaign) {
    return <p className="text-sm text-text-muted-warm">Loading campaign…</p>;
  }

  const recipientCount = campaign.results.length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/campaigns"
          className="text-sm text-text-muted-warm transition-colors hover:text-text-warm"
        >
          ← Back to campaigns
        </Link>
        <h2 className="mt-3 text-display-sm text-text-warm">{campaign.subject}</h2>
        <p className="mt-1 text-sm text-text-muted-warm">
          Sent {formatCampaignSentAt(campaign.sentAt)} · {campaign.sentCount} sent ·{" "}
          {campaign.failedCount} failed · {campaign.skippedCount} skipped ·{" "}
          {recipientCount} recipient{recipientCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-border-warm bg-card p-4">
          <h3 className="text-sm font-semibold text-text-warm">Message</h3>
          {campaign.bodyFormat === "html" ? (
            <div
              className="mt-3 text-sm leading-relaxed text-text-muted-warm [&_a]:text-primary [&_a]:underline [&_img]:my-3 [&_img]:max-h-80 [&_img]:max-w-full [&_img]:rounded-lg [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: campaign.body }}
            />
          ) : (
            <p className="mt-3 whitespace-pre-wrap text-sm text-text-muted-warm">{campaign.body}</p>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-border-warm bg-card">
          <div className="border-b border-border-warm bg-muted/20 px-4 py-3">
            <h3 className="text-sm font-semibold text-text-warm">Recipients</h3>
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
                          className="truncate text-sm font-medium text-text-warm transition-colors hover:text-primary"
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
                          hasEmail
                            ? "text-text-muted-warm"
                            : "text-amber-700 dark:text-amber-300"
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
