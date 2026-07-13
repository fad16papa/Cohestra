namespace LeadGenerationCrm.Contracts.Activities;

public sealed record ActivityRegistrationListItemResponse(
    Guid RegistrationId,
    string RegistrationNumber,
    Guid ClientId,
    string ClientFullName,
    DateTimeOffset SubmittedAt);

public sealed record ActivityRegistrationListResponse(
    IReadOnlyList<ActivityRegistrationListItemResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);
