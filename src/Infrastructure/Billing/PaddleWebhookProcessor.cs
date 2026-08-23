using Microsoft.Extensions.Logging;

namespace Cohestra.Infrastructure.Billing;

/// <summary>
/// Story 29.1 stub — log only. Ledger + HMAC + handlers land in Story 29.3.
/// Do not persist or query the ledger here: a stub row would make 29.3 skip the real event.
/// </summary>
public sealed class PaddleWebhookProcessor(ILogger<PaddleWebhookProcessor> logger) : IPaddleWebhookProcessor
{
    public Task<PaddleWebhookProcessResult> ProcessAsync(
        string eventId,
        string eventType,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(eventId))
        {
            return Task.FromResult(new PaddleWebhookProcessResult(false, false, "Missing event id."));
        }

        logger.LogInformation(
            "Paddle webhook {EventType} {EventId} received; persist and sync handlers land in Story 29.3.",
            eventType,
            eventId);

        return Task.FromResult(new PaddleWebhookProcessResult(false, false, "Ignored until Story 29.3."));
    }
}
