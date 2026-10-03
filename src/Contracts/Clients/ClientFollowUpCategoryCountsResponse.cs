namespace Cohestra.Contracts.Clients;

public sealed record ClientFollowUpCategoryCountsResponse(
    int DueNowCount,
    int AtRiskCount,
    int OpportunityCount,
    int HealthyCount);
