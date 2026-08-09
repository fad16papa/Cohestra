"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { clientProfileCardClassName, ClientProfileExpandableRegion } from "@/components/clients/client-profile-motion";
import { TimelineEvent } from "@/components/clients/timeline-event";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ClientTimelineItem } from "@/lib/clients-api";

type ClientRelationshipTimelineProps = {
  timeline: ClientTimelineItem[];
  defaultCollapsed?: boolean;
};

export function ClientRelationshipTimeline({
  timeline,
  defaultCollapsed = false,
}: ClientRelationshipTimelineProps) {
  const [expanded, setExpanded] = useState(
    !defaultCollapsed || timeline.length <= 3
  );

  const eventLabel =
    timeline.length === 1 ? "1 event" : `${timeline.length} events`;

  return (
    <Card className={clientProfileCardClassName}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Relationship timeline</CardTitle>
            <CardDescription>
              {timeline.length === 0
                ? "Registrations and follow-up events appear here."
                : `${eventLabel} · newest first`}
            </CardDescription>
          </div>
          {timeline.length > 0 ? (
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
              onClick={() => setExpanded((current) => !current)}
              aria-expanded={expanded}
            >
              {expanded ? (
                <>
                  Collapse
                  <ChevronUp className="size-4" aria-hidden />
                </>
              ) : (
                <>
                  Expand
                  <ChevronDown className="size-4" aria-hidden />
                </>
              )}
            </button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <p className="text-sm text-text-muted-warm">
            No timeline events yet. Registrations and status changes will appear
            here.
          </p>
        ) : (
          <>
            {!expanded ? (
              <p className="text-sm text-text-muted-warm">
                Timeline collapsed — expand to browse registrations, outreach,
                and status changes.
              </p>
            ) : null}

            <ClientProfileExpandableRegion expanded={expanded}>
              <div
                role="region"
                aria-label="Relationship timeline events"
                tabIndex={expanded ? 0 : -1}
                aria-hidden={!expanded}
                className="max-h-[min(28rem,55vh)] overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]"
              >
                <div className="space-y-5 pr-1 sm:pr-2">
                  {timeline.map((item) => (
                    <TimelineEvent
                      key={`${item.eventType}-${item.occurredAt}-${item.registrationId ?? item.label}`}
                      item={item}
                    />
                  ))}
                </div>
              </div>
            </ClientProfileExpandableRegion>
          </>
        )}
      </CardContent>
    </Card>
  );
}
