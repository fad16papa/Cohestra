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

public sealed record SupportIssueReplyResponse(
    string Body,
    DateTimeOffset CreatedAt);

public sealed record SupportIssueDetailResponse(
    Guid Id,
    string IssueNumber,
    string Subject,
    string Description,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<SupportIssueReplyResponse> Replies);
