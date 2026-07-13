namespace LeadGenerationCrm.Contracts.Clients;

public sealed record ClientListItemResponse(
    Guid Id,
    string FullName,
    string? Email,
    bool ConsentGiven,
    string? Nationality,
    string LeadStatus,
    DateTimeOffset? LastRegistrationAt,
    string? LastActivityName);

public sealed record ClientListResponse(
    IReadOnlyList<ClientListItemResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);
