using Cohestra.Domain.Billing;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Cohestra.Infrastructure.Billing;

/// <summary>
/// Story 29.1 stub — ledger-only. Event handlers land in Story 29.3.
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

        logger.LogInformation("Paddle webhook {EventType} {EventId} received; sync handlers land in Story 29.3.", eventType, eventId);

        dbContext.PaddleWebhookEvents.Add(new PaddleWebhookEvent
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            EventType = string.IsNullOrWhiteSpace(eventType) ? "unknown" : eventType,
            ProcessedAt = DateTimeOffset.UtcNow,
        });

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex)
        {
            logger.LogInformation(ex, "Concurrent webhook delivery for event {EventId}", eventId);
            return new PaddleWebhookProcessResult(false, true, "Duplicate event.");
        }

        return new PaddleWebhookProcessResult(false, false, "Ignored until Story 29.3.");
    }
}
