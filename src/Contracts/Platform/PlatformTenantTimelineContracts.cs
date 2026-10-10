namespace Cohestra.Contracts.Platform;

public static class PlatformTenantTimelineTypes
{
    public const string Audit = "audit";
    public const string Support = "support";
    public const string Outbox = "outbox";
    public const string Paddle = "paddle";
    public const string BillingSnapshot = "billing_snapshot";
}

public static class PlatformTenantTimelineProvenance
{
    public const string PlatformAuditLogs = "platform_audit_logs";
    public const string SupportIssues = "support_issues";
    public const string OutboxMessages = "outbox_messages";
    public const string PaddleWebhookDeliveries = "paddle_webhook_deliveries";
    public const string TenantBillingSnapshot = "tenants/current billing snapshot";
}

public static class PlatformTenantTimelineSourceStates
{
    public const string Present = "present";
    public const string Empty = "empty";
    public const string MissingInstrumentation = "missing_instrumentation";
}

public sealed record PlatformTenantTimelineItem(
    string Id,
    string Type,
    DateTimeOffset Timestamp,
    string Provenance,
    string Summary,
    IReadOnlyDictionary<string, string?> Metadata);

public sealed record PlatformTenantTimelineSourceStatus(
    string Source,
    string State,
    int ItemCount);

public sealed record PlatformTenantTimelineResponse(
    Guid TenantId,
    DateTimeOffset ObservedAt,
    bool HasHistoricalEvents,
    IReadOnlyList<PlatformTenantTimelineItem> Items,
    IReadOnlyList<PlatformTenantTimelineSourceStatus> Sources);
