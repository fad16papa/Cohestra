namespace Cohestra.Contracts.Clients;

public sealed record ClientListItemResponse(
    Guid Id,
    string FullName,
    string? Phone,
    string? Email,
    bool ConsentGiven,
    string? Nationality,
    string LeadStatus,
    DateTimeOffset? LastRegistrationAt,
    string? LastActivityName,
    DateTimeOffset? LastOutreachAt,
    string? LastOutreachKind);

public sealed record ClientListResponse(
    IReadOnlyList<ClientListItemResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    ClientLeadStatusCountsResponse StatusCounts);
