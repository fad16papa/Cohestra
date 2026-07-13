namespace Cohestra.Contracts.Dashboard;

public sealed record ActivityPerformanceItemResponse(
    Guid ActivityId,
    string ActivityName,
    string CommunityLabel,
    string Category,
    string Status,
    int RegistrationCount);

public sealed record DashboardMetricsResponse(
    int TotalLeads,
    int NewLeadsInPeriod,
    int PeriodDays,
    int ActiveActivitiesCount,
    double FollowUpCoveragePercent,
    IReadOnlyList<ActivityPerformanceItemResponse> ActivityPerformance,
    DateTimeOffset ComputedAt);
