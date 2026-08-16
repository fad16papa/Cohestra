namespace Cohestra.Contracts.Platform;

public sealed record PlatformSupportIssueListItemResponse(
    Guid Id,
    string IssueNumber,
    string TenantSlug,
    string OperatorEmail,
    string Subject,
    string Status,
    DateTimeOffset CreatedAt);

public sealed record PlatformSupportIssueListResponse(
    IReadOnlyList<PlatformSupportIssueListItemResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);

public sealed record PlatformSupportAttachmentResponse(
    Guid Id,
    string FileName,
    string ContentType,
    long SizeBytes,
    DateTimeOffset CreatedAt);

public sealed record PlatformSupportIssueDetailResponse(
    Guid Id,
    string IssueNumber,
    Guid TenantId,
    string TenantSlug,
    string TenantName,
    string Plan,
    string OperatorEmail,
    string OperatorDisplayName,
    string Subject,
    string Description,
    string Status,
    string? UserAgent,
    string? InternalNote,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<PlatformSupportAttachmentResponse> Attachments);

public sealed record UpdatePlatformSupportIssueRequest(
    string? Status,
    string? InternalNote);

public sealed record PlatformSupportReportQuery(
    string Preset,
    DateOnly? From = null,
    DateOnly? To = null);

public sealed record PlatformSupportReportPeriodResponse(
    string Preset,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    DateTimeOffset ComputedAt);

public sealed record PlatformSupportStatusCountResponse(
    string Status,
    int Count);

public sealed record PlatformSupportTenantVolumeResponse(
    string TenantSlug,
    string TenantName,
    int Count);

public sealed record PlatformSupportTrendPointResponse(
    DateOnly Date,
    int OpenedCount);

public sealed record PlatformSupportReportResponse(
    PlatformSupportReportPeriodResponse Period,
    int OpenedInPeriod,
    int ResolvedOrClosedInPeriod,
    int StillOpen,
    IReadOnlyList<PlatformSupportStatusCountResponse> CountsByStatus,
    IReadOnlyList<PlatformSupportTenantVolumeResponse> TopTenants,
    IReadOnlyList<PlatformSupportTrendPointResponse> DailyOpenedTrend);
