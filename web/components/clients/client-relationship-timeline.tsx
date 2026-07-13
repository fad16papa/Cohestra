import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { clientProfileCardClassName } from "@/components/clients/client-profile-motion";
import { TimelineEvent } from "@/components/clients/timeline-event";
import type { ClientTimelineItem } from "@/lib/clients-api";

type ClientRelationshipTimelineProps = {
  timeline: ClientTimelineItem[];
};

export function ClientRelationshipTimeline({
  timeline,
}: ClientRelationshipTimelineProps) {
  return (
    <Card className={clientProfileCardClassName}>
      <CardHeader>
        <CardTitle>Relationship timeline</CardTitle>
        <CardDescription>
          Registrations and follow-up events, newest first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <p className="text-sm text-text-muted-warm">
            No timeline events yet. Registrations and status changes will appear
            here.
          </p>
        ) : (
          <div
            role="region"
            aria-label="Relationship timeline events"
            tabIndex={0}
            className="h-64 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] sm:h-72 lg:h-80 [scrollbar-gutter:stable]"
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
        )}
      </CardContent>
    </Card>
  );
}
