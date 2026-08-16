namespace Cohestra.Contracts.Support;

public sealed record SupportIssueResponse(
    Guid Id,
    string IssueNumber,
    string Status,
    DateTimeOffset CreatedAt);

public sealed record SupportIssueListItemResponse(
    Guid Id,
    string IssueNumber,
    string Subject,
    string Status,
    DateTimeOffset CreatedAt);

public sealed record SupportIssueListResponse(
    IReadOnlyList<SupportIssueListItemResponse> Items);
