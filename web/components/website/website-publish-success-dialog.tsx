"use client";

import { CheckCircle2, Copy, ExternalLink, MessageCircle } from "lucide-react";

import { ExternalLinkButton } from "@/components/shared/external-link-button";
import { publicSiteHostnameFromUrl } from "@/lib/tenant-public-url";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type WebsitePublishSuccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liveUrl: string;
  liveDisplayUrl: string;
  onCopyLink: () => void;
  onCopyWhatsApp: () => void;
};

export function WebsitePublishSuccessDialog({
  open,
  onOpenChange,
  liveUrl,
  liveDisplayUrl,
  onCopyLink,
  onCopyWhatsApp,
}: WebsitePublishSuccessDialogProps) {
  const displayHost = liveDisplayUrl
    ? publicSiteHostnameFromUrl(liveDisplayUrl)
    : "your public homepage";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="border-b border-border-warm/60 bg-emerald-50/80 px-6 py-5 dark:bg-emerald-950/30">
          <AlertDialogHeader className="gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                <CheckCircle2 className="size-5" aria-hidden />
              </span>
              <div className="space-y-1">
                <AlertDialogTitle className="font-sans text-xl font-semibold tracking-tight">
                  Your homepage is live
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-relaxed">
                  Visitors can open your site at the address below. Share the link or copy a
                  WhatsApp message for your community chats.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
              Live site address
            </p>
            <div className="rounded-lg border border-border-warm bg-surface-warm/40 px-3 py-2.5">
              <p className="break-all font-mono text-sm font-medium text-text-warm">
                {liveDisplayUrl || "Resolving your public URL…"}
              </p>
              {liveDisplayUrl ? (
                <p className="mt-1 text-xs text-text-muted-warm">{displayHost}</p>
              ) : null}
            </div>
          </div>

          {liveUrl ? (
            <ExternalLinkButton href={liveUrl} className="w-full">
              <ExternalLink className="size-4" aria-hidden />
              Open live site
            </ExternalLinkButton>
          ) : (
            <Button type="button" className="w-full" disabled>
              <ExternalLink className="size-4" aria-hidden />
              Open live site
            </Button>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!liveUrl}
              onClick={onCopyLink}
            >
              <Copy className="size-4" aria-hidden />
              Copy link
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!liveUrl}
              onClick={onCopyWhatsApp}
            >
              <MessageCircle className="size-4" aria-hidden />
              Copy WhatsApp message
            </Button>
          </div>
        </div>

        <div className="border-t border-border-warm/60 px-6 py-4">
          <AlertDialogCancel className="w-full sm:w-auto">Done</AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
