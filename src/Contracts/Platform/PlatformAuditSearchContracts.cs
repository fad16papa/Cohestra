namespace Cohestra.Contracts.Platform;

public static class PlatformAuditSearchLimits
{
    public const int DefaultPageSize = 25;
    public const int MaxPageSize = 50;
    public const int MaxExportRows = 5000;
}

public sealed record PlatformAuditSearchQuery(
    string? Action,
    Guid? TenantId,
    string? ActorEmail,
    DateTimeOffset? From,
    DateTimeOffset? To,
    int Page = 1,
    int PageSize = PlatformAuditSearchLimits.DefaultPageSize);

public sealed record PlatformAuditListResponse(
    IReadOnlyList<PlatformAuditEntryResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);
