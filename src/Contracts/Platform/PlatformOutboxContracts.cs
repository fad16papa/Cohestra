namespace Cohestra.Contracts.Platform;

public static class PlatformOpsOutboxSources
{
    public const string OutboxMessages = "PostgreSQL outbox_messages";
}

public sealed record PlatformOpsOutboxSummaryResponse(
    PlatformKpi<IReadOnlyList<PlatformNamedCount>> CountsByStatus,
    PlatformKpi<IReadOnlyList<PlatformNamedCount>> CountsByMessageType);

public sealed record PlatformOpsOutboxItem(
    Guid Id,
    Guid TenantId,
    string MessageType,
    string Status,
    int AttemptCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset NextAttemptAt,
    DateTimeOffset? ProcessedAt,
    DateTimeOffset? ClaimedAt,
    DateTimeOffset? DispatchedAt,
    string? LastErrorSanitized);

public sealed record PlatformOpsOutboxListResponse(
    IReadOnlyList<PlatformOpsOutboxItem> Items,
    int Page,
    int PageSize,
    int TotalCount);

public sealed record PlatformOpsOutboxListQuery(
    string? Status,
    string? MessageType,
    Guid? TenantId,
    DateTimeOffset? From,
    DateTimeOffset? To,
    int Page,
    int PageSize);

public sealed record PlatformOpsOutboxQueryResult(
    bool Succeeded,
    PlatformOpsOutboxListResponse? Value,
    string? Error);
