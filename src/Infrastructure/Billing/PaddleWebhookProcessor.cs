using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Cohestra.Infrastructure.Billing;

/// <summary>
/// Story 29.1 stub — log only. Ledger + HMAC + handlers land in Story 29.3.
/// Do not persist here: a stub row with <c>ProcessedAt</c> set would make 29.3 skip the real event.
/// </summary>
public sealed class PaddleWebhookProcessor(
    CohestraDbContext dbContext,
    ILogger<PaddleWebhookProcessor> logger) : IPaddleWebhookProcessor
{
    public async Task<PaddleWebhookProcessResult> ProcessAsync(
        string eventId,
        string eventType,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(eventId))
        {
            return new PaddleWebhookProcessResult(false, false, "Missing event id.");
        }

        var existing = await dbContext.PaddleWebhookEvents
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.EventId == eventId, cancellationToken);

        if (existing is not null)
        {
            return new PaddleWebhookProcessResult(false, true, "Duplicate event.");
        }

        logger.LogInformation(
            "Paddle webhook {EventType} {EventId} received; persist and sync handlers land in Story 29.3.",
            eventType,
            eventId);

        return new PaddleWebhookProcessResult(false, false, "Ignored until Story 29.3.");
    }
}
