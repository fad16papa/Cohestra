namespace Cohestra.Contracts.Dashboard;

public sealed record ActivityPerformanceItemResponse(
    Guid ActivityId,
    string ActivityName,
    string CommunityLabel,
    string Category,
    string Status,
    int RegistrationCount);

/// <summary>Daily point in the registrations trend series (UTC dates).</summary>
public sealed record DashboardTrendPointResponse(
    DateOnly Date,
    int Registrations,
    int NewClients);

public sealed record DashboardLeadStatusBreakdownResponse(
    int NewCount,
    int ContactedCount,
    int ActiveCount,
    int InactiveCount);

public sealed record DashboardMetricsResponse(
    int TotalLeads,
    int NewLeadsInPeriod,
    int PeriodDays,
    int ActiveActivitiesCount,
    double FollowUpCoveragePercent,
    IReadOnlyList<ActivityPerformanceItemResponse> ActivityPerformance,
    DateTimeOffset ComputedAt,
    int RegistrationsInPeriod,
    int RegistrationsInPreviousPeriod,
    int TrendDays,
    IReadOnlyList<DashboardTrendPointResponse> RegistrationsTrend,
    DashboardLeadStatusBreakdownResponse LeadStatusBreakdown);
