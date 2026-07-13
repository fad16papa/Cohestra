namespace Cohestra.Contracts.Reports;

public sealed record ReportPeriodResponse(
    string Preset,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    DateTimeOffset ComputedAt);

public sealed record ReportFollowUpStatusResponse(
    int NewCount,
    int ContactedCount,
    int ActiveCount,
    int InactiveCount,
    double CoveragePercent);

public sealed record ReportLeadGrowthResponse(
    int NewLeadsInPeriod,
    int TotalLeadsAtEnd,
    int TotalLeadsBeforePeriod);

public sealed record ReportActivityRankingItemResponse(
    Guid ActivityId,
    string ActivityName,
    string CommunityLabel,
    int RegistrationCount);

public sealed record ReportCommunityRankingItemResponse(
    string CommunityLabel,
    int RegistrationCount);

public sealed record ReportCampaignResultsResponse(
    bool Available,
    int CampaignsSent,
    int CampaignsFailed);

public sealed record ReportResponse(
    ReportPeriodResponse Period,
    int ActivitiesHosted,
    int Registrations,
    int NewLeads,
    ReportFollowUpStatusResponse FollowUpStatus,
    IReadOnlyList<ReportActivityRankingItemResponse> ActivityRanking,
    ReportLeadGrowthResponse LeadGrowth,
    IReadOnlyList<ReportCommunityRankingItemResponse> CommunityRanking,
    int RepeatParticipants,
    int InactiveClients,
    ReportCampaignResultsResponse CampaignResults);
