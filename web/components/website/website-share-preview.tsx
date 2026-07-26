"use client";

import { ShareLinkPreview } from "@/components/shared/share-link-preview";
import type { SharePreviewData } from "@/lib/site-builder-utils";

type WebsiteSharePreviewProps = {
  preview: SharePreviewData;
};

export function WebsiteSharePreview({ preview }: WebsiteSharePreviewProps) {
  return (
    <ShareLinkPreview
      preview={preview}
      sampleMessage="Check out our upcoming events!"
      helperText="Approximate preview when you share your homepage link in WhatsApp, Telegram, or iMessage."
    />
  );
}
