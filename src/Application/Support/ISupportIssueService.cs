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
    Stream Content,
    string FileName,
    string ContentType,
    long SizeBytes);

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
