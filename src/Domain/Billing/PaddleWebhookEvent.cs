namespace Cohestra.Domain.Billing;

/// <summary>Idempotent Paddle webhook processing ledger (platform-scoped, not tenant-filtered).</summary>
public sealed class PaddleWebhookEvent
{
    public Guid Id { get; set; }

    public string EventId { get; set; } = string.Empty;

    public string EventType { get; set; } = string.Empty;

    public DateTimeOffset ProcessedAt { get; set; }
}
