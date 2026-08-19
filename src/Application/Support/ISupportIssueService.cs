namespace Cohestra.Application.Support;

public interface ISupportIssueService
{
    Task<SupportIssueCreateResult> CreateAsync(
        SupportIssueCreateRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SupportIssueSummary>> ListMineAsync(
        Guid tenantId,
        Guid operatorUserId,
        int limit = 10,
        CancellationToken cancellationToken = default);

    Task<SupportIssueOperatorDetail?> GetMineByIdAsync(
        Guid tenantId,
        Guid operatorUserId,
        Guid issueId,
        CancellationToken cancellationToken = default);
}

public sealed record SupportIssueCreateRequest(
    Guid TenantId,
    Guid OperatorUserId,
    string OperatorEmail,
    string OperatorDisplayName,
    string Subject,
    string Description,
    string? UserAgent,
    IReadOnlyList<SupportIssueUploadFile> Files);

public sealed record SupportIssueUploadFile(
    byte[] Content,
    string FileName,
    string ContentType);

public sealed record SupportIssueCreateResult(
    Guid Id,
    string IssueNumber,
    string Status,
    DateTimeOffset CreatedAt);

public sealed record SupportIssueSummary(
    Guid Id,
    string IssueNumber,
    string Subject,
    string Status,
    DateTimeOffset CreatedAt);

public sealed record SupportIssueOperatorDetail(
    Guid Id,
    string IssueNumber,
    string Subject,
    string Description,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<SupportIssueReplySummary> Replies);

public sealed record SupportIssueReplySummary(
    string Body,
    DateTimeOffset CreatedAt);
