"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { TimelineEvent } from "@/components/clients/timeline-event";
import { clientProfileCardClassName } from "@/components/clients/client-profile-motion";
import type { ClientTimelineItem } from "@/lib/clients-api";
import { cn } from "@/lib/utils";

type ClientTimelinePreviewProps = {
  timeline: ClientTimelineItem[];
  profileAnchorId?: string;
  className?: string;
};

const PREVIEW_LIMIT = 5;

export function ClientTimelinePreview({
  timeline,
  profileAnchorId = "client-full-timeline",
  className,
}: ClientTimelinePreviewProps) {
  const previewItems = timeline.slice(0, PREVIEW_LIMIT);

  return (
    <section
      className={cn(
        clientProfileCardClassName,
        "rounded-2xl border border-border-warm bg-card p-5 shadow-sm",
        className
      )}
      aria-labelledby="client-timeline-preview-heading"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3
            id="client-timeline-preview-heading"
            className="text-sm font-semibold text-text-warm"
          >
            Recent activity
          </h3>
          <p className="mt-1 text-sm text-text-muted-warm">
            Last {Math.min(timeline.length, PREVIEW_LIMIT)} events — registrations and outreach.
          </p>
        </div>
        {timeline.length > PREVIEW_LIMIT ? (
          <Link
            href={`#${profileAnchorId}`}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>

      {previewItems.length === 0 ? (
        <p className="text-sm text-text-muted-warm">
          No timeline events yet. Registrations and outreach will appear here.
        </p>
      ) : (
        <div className="space-y-4">
          {previewItems.map((item) => (
            <TimelineEvent
              key={`${item.eventType}-${item.occurredAt}-${item.registrationId ?? item.label}`}
              item={item}
            />
          ))}
        </div>
      )}
    </section>
  );
}
