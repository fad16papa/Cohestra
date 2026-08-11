namespace Cohestra.Contracts.Reports;

public sealed record ReportPriorPeriodResponse(
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    int Registrations,
    int NewLeads,
    int ActivitiesHosted,
    double FollowUpCoveragePercent);
