using Cohestra.Application.Outbox;
using Cohestra.Domain.Outbox;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Outbox;

public sealed class OutboxProcessor(
    CohestraDbContext dbContext,
    IEnumerable<IOutboxMessageHandler> handlers,
    IOptions<OutboxOptions> options,
    ILogger<OutboxProcessor> logger) : IOutboxProcessor
{
    private readonly IReadOnlyDictionary<string, IOutboxMessageHandler> _handlers =
        handlers.ToDictionary(handler => handler.MessageType, StringComparer.Ordinal);

    public async Task<int> ProcessBatchAsync(CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        if (!settings.Enabled)
        {
            return 0;
        }

        var now = DateTimeOffset.UtcNow;
        var batchSize = Math.Max(1, settings.BatchSize);

        var claimed = await ClaimPendingMessagesAsync(now, batchSize, cancellationToken);
        if (claimed.Count == 0)
        {
            return 0;
        }

        var processed = 0;

        foreach (var message in claimed)
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (!_handlers.TryGetValue(message.MessageType, out var handler))
            {
                await MarkFailedAsync(
                    message,
                    $"No outbox handler registered for message type '{message.MessageType}'.",
                    settings,
                    cancellationToken,
                    deadLetter: true);
                processed++;
                continue;
            }

            try
            {
                await handler.HandleAsync(message, cancellationToken);
                await MarkCompletedAsync(message, cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(
                    ex,
                    "Outbox message {MessageId} ({MessageType}) failed on attempt {Attempt}.",
                    message.Id,
                    message.MessageType,
                    message.AttemptCount);

                await MarkFailedAsync(message, ex.Message, settings, cancellationToken, deadLetter: false);
            }

            processed++;
        }

        return processed;
    }

    private async Task<List<OutboxMessage>> ClaimPendingMessagesAsync(
        DateTimeOffset now,
        int batchSize,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var pendingStatus = OutboxMessageStatus.Pending.ToString();
        var claimed = await dbContext.OutboxMessages
            .FromSqlInterpolated($"""
                SELECT *
                FROM public.outbox_messages
                WHERE status = {pendingStatus}
                  AND next_attempt_at <= {now}
                ORDER BY created_at
                LIMIT {batchSize}
                FOR UPDATE SKIP LOCKED
                """)
            .ToListAsync(cancellationToken);

        var processingStatus = OutboxMessageStatus.Processing.ToString();
        foreach (var message in claimed)
        {
            message.Status = OutboxMessageStatus.Processing;
            message.AttemptCount += 1;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return claimed;
    }

    private async Task MarkCompletedAsync(OutboxMessage message, CancellationToken cancellationToken)
    {
        message.Status = OutboxMessageStatus.Completed;
        message.ProcessedAt = DateTimeOffset.UtcNow;
        message.LastError = null;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task MarkFailedAsync(
        OutboxMessage message,
        string error,
        OutboxOptions settings,
        CancellationToken cancellationToken,
        bool deadLetter)
    {
        var trimmedError = error.Length <= 2000 ? error : error[..2000];
        message.LastError = trimmedError;

        if (deadLetter || message.AttemptCount >= settings.MaxAttempts)
        {
            message.Status = OutboxMessageStatus.Failed;
            message.ProcessedAt = DateTimeOffset.UtcNow;
        }
        else
        {
            message.Status = OutboxMessageStatus.Pending;
            var delaySeconds = settings.BaseRetryDelaySeconds * Math.Pow(2, Math.Max(0, message.AttemptCount - 1));
            message.NextAttemptAt = DateTimeOffset.UtcNow.AddSeconds(Math.Min(delaySeconds, 3600));
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
