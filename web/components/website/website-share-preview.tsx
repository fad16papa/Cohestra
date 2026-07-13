"use client";

import Image from "next/image";

import type { SharePreviewData } from "@/lib/site-builder-utils";

type WebsiteSharePreviewProps = {
  preview: SharePreviewData;
};

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function WebsiteSharePreview({ preview }: WebsiteSharePreviewProps) {
  const hostname = hostnameFromUrl(preview.url);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-text-warm">WhatsApp &amp; link preview</p>
      <p className="text-xs text-text-muted-warm">
        Approximate preview when you share your homepage link in WhatsApp, Telegram, or
        iMessage.
      </p>
      <div className="rounded-xl border border-border-warm bg-[#e7fedf] p-3 dark:bg-emerald-950/30">
        <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-xs text-emerald-950 shadow-sm dark:bg-emerald-900/80 dark:text-emerald-50">
          Check out our upcoming events!
        </div>
        <div className="mt-2 overflow-hidden rounded-xl border border-border-warm bg-card shadow-sm">
          {preview.imageUrl ? (
            <div className="relative aspect-[1.91/1] w-full bg-muted">
              <Image
                src={preview.imageUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized={preview.imageUrl.includes("/api/")}
              />
            </div>
          ) : (
            <div className="flex aspect-[1.91/1] items-center justify-center bg-muted/40 px-4 text-center text-xs text-text-muted-warm">
              Add a hero image for a richer link preview
            </div>
          )}
          <div className="space-y-1 border-t border-border-warm px-3 py-2.5">
            <p className="line-clamp-2 text-sm font-semibold text-text-warm">
              {preview.title}
            </p>
            <p className="line-clamp-2 text-xs leading-relaxed text-text-muted-warm">
              {preview.description}
            </p>
            <p className="truncate text-[11px] uppercase tracking-wide text-text-muted-warm">
              {hostname}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
