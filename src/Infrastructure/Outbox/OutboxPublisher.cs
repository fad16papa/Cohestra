using Cohestra.Application.Outbox;
using Cohestra.Domain.Outbox;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Cohestra.Infrastructure.Outbox;

public sealed class OutboxPublisher(
    CohestraDbContext dbContext,
    ILogger<OutboxPublisher> logger) : IOutboxPublisher
{
    public void Enqueue(
        Guid tenantId,
        string messageType,
        string payloadJson,
        string? dedupeKey = null,
        DateTimeOffset? nextAttemptAt = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(messageType);
        ArgumentException.ThrowIfNullOrWhiteSpace(payloadJson);

        if (tenantId == Guid.Empty)
        {
            throw new ArgumentException("TenantId is required for outbox messages.", nameof(tenantId));
        }

        if (!string.IsNullOrWhiteSpace(dedupeKey))
        {
            var normalizedKey = dedupeKey.Trim();
            var alreadyQueued = dbContext.OutboxMessages.Local.Any(message =>
                message.DedupeKey == normalizedKey
                && message.Status != OutboxMessageStatus.Failed)
                || dbContext.OutboxMessages.Any(message =>
                    message.DedupeKey == normalizedKey
                    && message.Status != OutboxMessageStatus.Failed);

            if (alreadyQueued)
            {
                return;
            }

            dedupeKey = normalizedKey;
        }

        var now = DateTimeOffset.UtcNow;
        dbContext.OutboxMessages.Add(new OutboxMessage
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            MessageType = messageType.Trim(),
            PayloadJson = payloadJson,
            DedupeKey = string.IsNullOrWhiteSpace(dedupeKey) ? null : dedupeKey.Trim(),
            Status = OutboxMessageStatus.Pending,
            AttemptCount = 0,
            CreatedAt = now,
            NextAttemptAt = nextAttemptAt ?? now,
        });

        logger.LogDebug(
            "Enqueued outbox message {MessageType} for tenant {TenantId} (dedupe={DedupeKey}).",
            messageType,
            tenantId,
            dedupeKey);
    }
}
