"use client";

import type { ReactNode } from "react";
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
import { ExternalLinkButton } from "@/components/shared/external-link-button";
import { cn } from "@/lib/utils";

type WebsiteBuilderToolbarProps = {
  siteUrl: string;
  siteDisplayUrl: string;
  statusLabel: string;
  statusClassName: string;
  autoSaveLabel: string | null;
  autoSaveStatus: "idle" | "pending" | "saving" | "saved" | "error";
  lastSavedLabel: string | null;
  publishedAt: string | null;
  upcomingActivityCount: number;
  enabledSectionCount: number;
  publishBlockerCount: number;
  checklistHidden?: boolean;
  isPreviewOpening: boolean;
  isDirty: boolean;
  canPublish: boolean;
  publishBlockers: number;
  isSaving: boolean;
  isHeroUploading: boolean;
  isLogoUploading: boolean;
  onCopyLink: () => void;
  onShowChecklist?: () => void;
  onPreview: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
};

function formatPublished(iso: string | null): string {
  if (!iso) {
    return "Not published";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function WebsiteBuilderToolbar({
  siteUrl,
  siteDisplayUrl,
  statusLabel,
  statusClassName,
  autoSaveLabel,
  autoSaveStatus,
  lastSavedLabel,
  publishedAt,
  upcomingActivityCount,
  enabledSectionCount,
  publishBlockerCount,
  checklistHidden = false,
  isPreviewOpening,
  isDirty,
  canPublish,
  publishBlockers,
  isSaving,
  isHeroUploading,
  isLogoUploading,
  onCopyLink,
  onShowChecklist,
  onPreview,
  onSaveDraft,
  onPublish,
}: WebsiteBuilderToolbarProps) {
  return (
    <header className="space-y-2.5 rounded-xl border border-border-warm bg-card p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-display-sm text-text-warm">Website Builder</h2>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                statusClassName
              )}
            >
              {statusLabel}
            </span>
            {autoSaveLabel ? (
              <span
                className={cn(
                  "text-xs",
                  autoSaveStatus === "error"
                    ? "text-destructive"
                    : "text-text-muted-warm"
                )}
              >
                {autoSaveLabel}
              </span>
            ) : null}
            {lastSavedLabel ? (
              <span className="text-xs text-text-muted-warm">{lastSavedLabel}</span>
            ) : null}
          </div>
          <p className="max-w-2xl text-xs text-text-muted-warm sm:text-sm">
            Design and publish your public homepage — changes go live only when you publish.
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted-warm sm:text-sm">
            <Globe className="size-3.5 shrink-0 text-primary" aria-hidden />
            <span className="break-all">{siteDisplayUrl}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
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
          <ExternalLinkButton href={siteUrl} variant="outline" size="sm">
            <ExternalLink className="size-4" aria-hidden />
            Open live
          </ExternalLinkButton>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              isPreviewOpening ||
              isDirty ||
              autoSaveStatus === "pending" ||
              autoSaveStatus === "saving"
            }
            onClick={onPreview}
          >
            Preview
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!isDirty || isSaving || isHeroUploading || isLogoUploading}
            onClick={onSaveDraft}
          >
            {isSaving ? "Saving…" : "Save draft"}
          </Button>
          <Button
            id="website-builder-publish"
            type="button"
            size="sm"
            disabled={!canPublish || publishBlockers > 0}
            onClick={onPublish}
          >
            Publish homepage
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-border-warm pt-2.5">
        <MetricChip label="Published" value={formatPublished(publishedAt)} />
        <MetricChip
          icon={<CalendarDays className="size-3.5" aria-hidden />}
          label="Events"
          value={`${upcomingActivityCount} upcoming`}
        />
        <MetricChip
          icon={<Layers className="size-3.5" aria-hidden />}
          label="Sections"
          value={`${enabledSectionCount} visible`}
        />
        <MetricChip
          icon={<AlertCircle className="size-3.5" aria-hidden />}
          label="Blockers"
          value={
            publishBlockerCount > 0
              ? `${publishBlockerCount} to fix`
              : "Ready to publish"
          }
          tone={publishBlockerCount > 0 ? "warning" : "success"}
        />
      </div>
    </header>
  );
}

function MetricChip({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: "neutral" | "warning" | "success";
}) {
  return (
    <div
      className={cn(
        "inline-flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
        tone === "warning" && "border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20",
        tone === "success" && "border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20",
        tone === "neutral" && "border-border-warm bg-surface-warm/40"
      )}
    >
      {icon}
      <span className="font-medium uppercase tracking-wide text-text-muted-warm">{label}</span>
      <span
        className={cn(
          "font-medium text-text-warm",
          tone === "warning" && "text-destructive",
          tone === "success" && "text-emerald-700 dark:text-emerald-300"
        )}
      >
        {value}
      </span>
    </div>
  );
}
