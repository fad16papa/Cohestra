"use client";

import {
  AlertCircle,
  CalendarDays,
  Copy,
  ExternalLink,
  Globe,
  Layers,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WebsiteHealthStripProps = {
  siteUrl: string;
  statusLabel: string;
  statusClassName: string;
  publishedAt: string | null;
  upcomingActivityCount: number;
  enabledSectionCount: number;
  publishBlockerCount: number;
  checklistHidden?: boolean;
  onCopyLink: () => void;
  onOpenLive: () => void;
  onShowChecklist?: () => void;
};

function formatPublished(iso: string | null): string {
  if (!iso) {
    return "Not published yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function WebsiteHealthStrip({
  siteUrl,
  statusLabel,
  statusClassName,
  publishedAt,
  upcomingActivityCount,
  enabledSectionCount,
  publishBlockerCount,
  checklistHidden = false,
  onCopyLink,
  onOpenLive,
  onShowChecklist,
}: WebsiteHealthStripProps) {
  return (
    <section className="rounded-xl border border-border-warm bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Globe className="size-4 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold text-text-warm">Site status</h2>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                statusClassName
              )}
            >
              {statusLabel}
            </span>
          </div>
          <p className="break-all text-sm text-text-muted-warm">{siteUrl}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {checklistHidden && onShowChecklist ? (
            <Button type="button" variant="ghost" size="sm" onClick={onShowChecklist}>
              <Sparkles className="size-4" aria-hidden />
              Setup guide
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={onCopyLink}>
            <Copy className="size-4" aria-hidden />
            Copy link
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onOpenLive}>
            <ExternalLink className="size-4" aria-hidden />
            Open live site
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border-warm bg-surface-warm/40 px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
            Last published
          </p>
          <p className="mt-1 text-sm font-medium text-text-warm">
            {formatPublished(publishedAt)}
          </p>
        </div>
        <div className="rounded-lg border border-border-warm bg-surface-warm/40 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted-warm">
            <CalendarDays className="size-3.5" aria-hidden />
            Upcoming events
          </p>
          <p className="mt-1 text-sm font-medium text-text-warm">
            {upcomingActivityCount} on homepage
          </p>
        </div>
        <div className="rounded-lg border border-border-warm bg-surface-warm/40 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted-warm">
            <Layers className="size-3.5" aria-hidden />
            Sections
          </p>
          <p className="mt-1 text-sm font-medium text-text-warm">
            {enabledSectionCount} visible
          </p>
        </div>
        <div className="rounded-lg border border-border-warm bg-surface-warm/40 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted-warm">
            <AlertCircle className="size-3.5" aria-hidden />
            Publish blockers
          </p>
          <p
            className={cn(
              "mt-1 text-sm font-medium",
              publishBlockerCount > 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-300"
            )}
          >
            {publishBlockerCount > 0
              ? `${publishBlockerCount} to fix`
              : "None — ready to publish"}
          </p>
        </div>
      </div>
    </section>
  );
}
