"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";

import { ShareLinkPreview } from "@/components/shared/share-link-preview";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard } from "@/lib/clipboard";
import type { SharePreviewData } from "@/lib/site-builder-utils";

type WebsiteSharePreviewProps = {
  preview: SharePreviewData;
  copyUrl: string;
};

export function WebsiteSharePreview({ preview, copyUrl }: WebsiteSharePreviewProps) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleCopyLink() {
    setStatusMessage(null);
    const copied = await copyTextToClipboard(copyUrl);
    setStatusMessage(copied ? "Link copied." : "Select the URL and copy manually.");
  }

  return (
    <div className="space-y-3">
      <ShareLinkPreview
        preview={preview}
        sampleMessage={`Check out ${preview.title}!`}
        helperText="How your homepage may appear when shared on social or chat apps."
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void handleCopyLink()}>
          <Link2 className="size-4" aria-hidden />
          Copy link
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
