"use client";

import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ExternalLinkButton } from "@/components/shared/external-link-button";
import { WebsitePublishGateSummary } from "@/components/website/website-section-fields";
import type { PublishGateResult } from "@/lib/site-draft-utils";
import { cn } from "@/lib/utils";

type WebsiteBuilderToolbarProps = {
  siteUrl: string;
  siteDisplayUrl: string;
  statusLabel: string;
  statusClassName: string;
  autoSaveLabel: string | null;
  autoSaveStatus: "idle" | "pending" | "saving" | "saved" | "error";
  lastSavedLabel: string | null;
  publishGate: PublishGateResult;
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

export function WebsiteBuilderToolbar({
  siteUrl,
  siteDisplayUrl,
  statusLabel,
  statusClassName,
  autoSaveLabel,
  autoSaveStatus,
  lastSavedLabel,
  publishGate,
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
  const hasBlockers = publishGate.blockers.length > 0;
  const hasWarnings = publishGate.warnings.length > 0;
  const isReady = !hasBlockers && !hasWarnings;

  return (
    <header className="shrink-0 space-y-2 rounded-xl border border-border-warm bg-card p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-display-sm text-text-warm">Website Builder</h2>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                statusClassName,
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
                    : "text-text-muted-warm",
                )}
              >
                {autoSaveLabel}
              </span>
            ) : null}
            {lastSavedLabel ? (
              <span className="hidden text-xs text-text-muted-warm sm:inline">
                {lastSavedLabel}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted-warm sm:text-sm">
            <Globe className="size-3.5 shrink-0 text-primary" aria-hidden />
            <span className="break-all">{siteDisplayUrl}</span>
          </div>
        </div>

        <div
          id="website-builder-toolbar"
          className="flex shrink-0 flex-wrap items-center gap-2"
        >
          {isReady ? (
            <span className="hidden items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 sm:inline-flex">
              <CheckCircle2 className="size-3.5" aria-hidden />
              Ready to publish
            </span>
          ) : hasBlockers ? (
            <span className="hidden items-center gap-1 text-xs font-medium text-destructive sm:inline-flex">
              <AlertCircle className="size-3.5" aria-hidden />
              {publishBlockers} blocker{publishBlockers === 1 ? "" : "s"}
            </span>
          ) : null}

          {checklistHidden && onShowChecklist ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onShowChecklist}
            >
              <Sparkles className="size-4" aria-hidden />
              <span className="hidden sm:inline sm:ml-1.5">Setup</span>
              <span className="sr-only sm:hidden">Setup guide</span>
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={onCopyLink}>
            <Copy className="size-4" aria-hidden />
            <span className="hidden sm:inline sm:ml-1.5">Copy link</span>
            <span className="sr-only sm:hidden">Copy link</span>
          </Button>
          <ExternalLinkButton href={siteUrl} variant="ghost" size="sm">
            <ExternalLink className="size-4" aria-hidden />
            <span className="hidden sm:inline sm:ml-1.5">Open live</span>
            <span className="sr-only sm:hidden">Open live site</span>
          </ExternalLinkButton>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            disabled={
              isPreviewOpening ||
              isDirty ||
              autoSaveStatus === "pending" ||
              autoSaveStatus === "saving"
            }
            onClick={onPreview}
          >
            Share preview
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
            Publish
          </Button>
        </div>
      </div>

      {!isReady ? (
        <div
          id="website-publish-readiness"
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            hasBlockers
              ? "border-destructive/40 bg-destructive/5"
              : "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20",
          )}
        >
          <p className="mb-1 font-medium text-text-warm">
            {hasBlockers
              ? "Fix these before publishing"
              : "Optional improvements"}
          </p>
          <WebsitePublishGateSummary gate={publishGate} />
        </div>
      ) : null}
    </header>
  );
}
