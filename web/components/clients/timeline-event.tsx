import {
  leadStatusLabels,
  type ClientTimelineItem,
} from "@/lib/clients-api";

type TimelineEventProps = {
  item: ClientTimelineItem;
};

function formatOccurredAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStatusChange(item: ClientTimelineItem) {
  const previous = item.previousLeadStatus
    ? leadStatusLabels[item.previousLeadStatus]
    : "Unknown";
  const next = item.newLeadStatus
    ? leadStatusLabels[item.newLeadStatus]
    : "Unknown";

  return `${previous} → ${next}`;
}

function formatTimelineSummary(item: ClientTimelineItem) {
  if (item.eventType === "registration_submitted") {
    return item.activityName ?? "Activity registration";
  }

  if (item.eventType === "lead_status_changed") {
    return formatStatusChange(item);
  }

  if (item.eventType === "email_campaign_sent") {
    return item.campaignSubject ?? "Campaign email";
  }

  if (item.eventType === "whatsapp_initiated") {
    return "WhatsApp chat opened";
  }

  if (item.eventType === "whatsapp_follow_up_recorded") {
    return item.campaignSubject ?? "Follow-up recorded";
  }

  return item.activityName ?? "Update recorded";
}

export function TimelineEvent({ item }: TimelineEventProps) {
  const summary = formatTimelineSummary(item);

  return (
    <article className="min-w-0 border-l-4 border-primary py-1 pl-3 sm:pl-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
        {item.label}
      </p>
      <p className="mt-1 break-words text-sm text-text-warm">{summary}</p>
      {item.referralSource ? (
        <p className="mt-1 break-words text-sm text-text-muted-warm">
          Referral source: {item.referralSource}
        </p>
      ) : null}
      {item.note ? (
        <p className="mt-1 break-words text-sm text-text-muted-warm">Note: {item.note}</p>
      ) : null}
      <time
        dateTime={item.occurredAt}
        className="mt-2 block text-xs text-text-muted-warm"
      >
        {formatOccurredAt(item.occurredAt)}
      </time>
    </article>
  );
}
