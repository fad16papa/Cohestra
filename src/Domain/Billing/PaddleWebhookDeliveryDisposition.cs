namespace Cohestra.Domain.Billing;

/// <summary>
/// Canonical diagnostic vocabulary for <c>paddle_webhook_deliveries</c>.
/// Distinct from processor <c>PaddleWebhookDisposition</c> (which keeps <c>Invalid</c>).
/// </summary>
public enum PaddleWebhookDeliveryDisposition
{
    Processed = 0,
    Duplicate = 1,
    Ignored = 2,
    Retryable = 3,
    Rejected = 4,
}
