namespace Cohestra.Contracts.Platform;

public static class PlatformOpsPaddleSources
{
    public const string Deliveries = "PostgreSQL paddle_webhook_deliveries";
}

public sealed record PlatformOpsPaddleConfigResponse(
    bool IsConfigured,
    string Environment,
    bool AllowLive,
    string ApiHost);

public sealed record PlatformOpsPaddleDeliveryItem(
    Guid Id,
    string? EventId,
    string? EventType,
    string Disposition,
    Guid? TenantId,
    int HttpStatus,
    string? DetailSanitized,
    DateTimeOffset ObservedAt);

public sealed record PlatformOpsPaddleDeliveryListResponse(
    IReadOnlyList<PlatformOpsPaddleDeliveryItem> Items,
    int Page,
    int PageSize,
    int TotalCount);

public sealed record PlatformOpsPaddleDeliveryListQuery(
    string? Disposition,
    string? EventType,
    Guid? TenantId,
    DateTimeOffset? From,
    DateTimeOffset? To,
    int Page,
    int PageSize);

public sealed record PlatformOpsPaddleDeliveryQueryResult(
    bool Succeeded,
    PlatformOpsPaddleDeliveryListResponse? Value,
    string? Error);
