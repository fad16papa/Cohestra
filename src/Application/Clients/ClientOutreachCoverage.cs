using Cohestra.Domain.Clients;

namespace Cohestra.Application.Clients;

/// <summary>
/// Timeline event types that count as outreach for follow-up coverage metrics and list filters.
/// </summary>
public static class ClientOutreachCoverage
{
    public static readonly ClientTimelineEventType[] FollowUpCoverageEventTypes =
    [
        ClientTimelineEventType.EmailCampaignSent,
        ClientTimelineEventType.WhatsAppInitiated,
        ClientTimelineEventType.WhatsAppFollowUpRecorded,
        ClientTimelineEventType.ViberInitiated,
        ClientTimelineEventType.ViberFollowUpRecorded,
    ];
}
