"use client";

import { useMemo, useState } from "react";
import { Link2, MessageCircle } from "lucide-react";

import { ShareLinkPreview } from "@/components/shared/share-link-preview";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard } from "@/lib/clipboard";
import { buildHomepageWhatsAppMessage } from "@/lib/share-kit-utils";
import type { SharePreviewData } from "@/lib/site-builder-utils";

type WebsiteSharePreviewProps = {
  preview: SharePreviewData;
  siteName?: string;
};

export function WebsiteSharePreview({ preview, siteName }: WebsiteSharePreviewProps) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const whatsAppMessage = useMemo(
    () =>
      buildHomepageWhatsAppMessage(preview.url, {
        siteName,
        headline: preview.title,
      }),
    [preview.title, preview.url, siteName]
  );

  async function handleCopyLink() {
    setStatusMessage(null);
    const copied = await copyTextToClipboard(preview.url);
    setStatusMessage(copied ? "Link copied." : "Select the URL and copy manually.");
  }

  async function handleCopyWhatsAppMessage() {
    setStatusMessage(null);
    const copied = await copyTextToClipboard(whatsAppMessage);
    setStatusMessage(
      copied ? "WhatsApp message copied." : "Could not copy automatically."
    );
  }

  return (
    <div className="space-y-3">
      <ShareLinkPreview
        preview={preview}
        sampleMessage={whatsAppMessage.split("\n")[0] ?? "Check this out!"}
        helperText="How your homepage may appear when shared."
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void handleCopyLink()}>
          <Link2 className="size-4" aria-hidden />
          Copy link
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleCopyWhatsAppMessage()}
        >
          <MessageCircle className="size-4" aria-hidden />
          Copy WhatsApp
        </Button>
      </div>
      {statusMessage ? (
        <p role="status" className="text-xs text-text-muted-warm">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
