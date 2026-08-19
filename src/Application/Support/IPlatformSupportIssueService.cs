using Cohestra.Contracts.Platform;

namespace Cohestra.Application.Support;

public interface IPlatformSupportIssueService
{
    Task<PlatformSupportIssueListResponse> ListAsync(
        string? search,
        string? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<PlatformSupportIssueDetailResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<PlatformSupportIssueDetailResponse?> UpdateAsync(
        Guid id,
        UpdatePlatformSupportIssueRequest request,
        CancellationToken cancellationToken = default);

    Task<PlatformSupportIssueDetailResponse?> AddReplyAsync(
        Guid id,
        AddPlatformSupportReplyRequest request,
        Guid actorUserId,
        string? actorEmail,
        CancellationToken cancellationToken = default);

    Task<int> GetOpenCountAsync(CancellationToken cancellationToken = default);

    Task<PlatformSupportAttachmentFileResult?> GetAttachmentFileAsync(
        Guid issueId,
        Guid attachmentId,
        CancellationToken cancellationToken = default);
}

public sealed record PlatformSupportAttachmentFileResult(
    byte[] Content,
    string ContentType,
    string FileName);
