namespace Cohestra.Domain.Billing;

/// <summary>
/// Additive Paddle webhook diagnostic row. Not the idempotency ledger
/// (<see cref="PaddleWebhookEvent"/>) and not tenant-owned.
/// </summary>
public sealed class PaddleWebhookDelivery
{
    public Guid Id { get; set; }

    public string? EventId { get; set; }

    public string? EventType { get; set; }

    public PaddleWebhookDeliveryDisposition Disposition { get; set; }

    public Guid? TenantId { get; set; }

    public int HttpStatus { get; set; }

    public string? DetailSanitized { get; set; }

    public DateTimeOffset ObservedAt { get; set; }
}
