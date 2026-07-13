namespace LeadGenerationCrm.Contracts.Activities;

public sealed record ActivityListResponse(
    IReadOnlyList<ActivityResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);
