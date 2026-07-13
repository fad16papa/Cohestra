namespace Cohestra.Contracts.Clients;

public sealed record ClientTimelineItemResponse(
    string EventType,
    DateTimeOffset OccurredAt,
    string Label,
    string? ActivityName,
    string? ReferralSource,
    string? PreviousLeadStatus,
    string? NewLeadStatus,
    Guid? RegistrationId,
    string? CampaignSubject,
    string? Note);
