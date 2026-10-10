using Cohestra.Domain.Billing;

namespace Cohestra.Application.Billing;

public sealed record PaddleWebhookDeliveryRecord(
    PaddleWebhookDeliveryDisposition Disposition,
    int HttpStatus,
    string? Detail,
    string? EventId = null,
    string? EventType = null,
    Guid? TenantId = null);

/// <summary>
/// Best-effort diagnostic writer. Implementations must use an isolated DbContext
/// and must not throw to the webhook HTTP path.
/// </summary>
public interface IPaddleWebhookDeliveryRecorder
{
    Task RecordAsync(
        PaddleWebhookDeliveryRecord record,
        CancellationToken cancellationToken = default);
}
