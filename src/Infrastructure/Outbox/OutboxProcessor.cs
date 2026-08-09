using System.Text.Json;
using Cohestra.Application.Outbox;
using Cohestra.Domain.Campaigns;
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

        var claimed = await ClaimPendingMessagesAsync(now, batchSize, settings, cancellationToken);
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

                var isDeadLetter = message.AttemptCount >= settings.MaxAttempts;
                await MarkFailedAsync(message, ex.Message, settings, cancellationToken, deadLetter: isDeadLetter);
            }

            processed++;
        }

        return processed;
    }

    private async Task<List<OutboxMessage>> ClaimPendingMessagesAsync(
        DateTimeOffset now,
        int batchSize,
        OutboxOptions settings,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var pendingStatus = OutboxMessageStatus.Pending.ToString();
        var processingStatus = OutboxMessageStatus.Processing.ToString();
        var staleBefore = now.AddSeconds(-Math.Max(30, settings.ProcessingTimeoutSeconds));

        await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"""
            UPDATE public.outbox_messages
            SET "Status" = {pendingStatus},
                "ClaimedAt" = NULL
            WHERE "Status" = {processingStatus}
              AND "ClaimedAt" IS NOT NULL
              AND "ClaimedAt" < {staleBefore}
            """,
            cancellationToken);

        var claimed = await dbContext.OutboxMessages
            .FromSqlInterpolated($"""
                SELECT *
                FROM public.outbox_messages
                WHERE "Status" = {pendingStatus}
                  AND "NextAttemptAt" <= {now}
                ORDER BY "CreatedAt"
                LIMIT {batchSize}
                FOR UPDATE SKIP LOCKED
                """)
            .ToListAsync(cancellationToken);

        foreach (var message in claimed)
        {
            message.Status = OutboxMessageStatus.Processing;
            message.AttemptCount += 1;
            message.ClaimedAt = now;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return claimed;
    }

    private async Task MarkCompletedAsync(OutboxMessage message, CancellationToken cancellationToken)
    {
        message.Status = OutboxMessageStatus.Completed;
        message.ProcessedAt = DateTimeOffset.UtcNow;
        message.ClaimedAt = null;
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
        message.ClaimedAt = null;

        if (deadLetter || message.AttemptCount >= settings.MaxAttempts)
        {
            message.Status = OutboxMessageStatus.Failed;
            message.ProcessedAt = DateTimeOffset.UtcNow;
            message.DedupeKey = null;
            await dbContext.SaveChangesAsync(cancellationToken);
            await HandleDeadLetterSideEffectsAsync(message, cancellationToken);
        }
        else
        {
            message.Status = OutboxMessageStatus.Pending;
            var delaySeconds = settings.BaseRetryDelaySeconds * Math.Pow(2, Math.Max(0, message.AttemptCount - 1));
            message.NextAttemptAt = DateTimeOffset.UtcNow.AddSeconds(Math.Min(delaySeconds, 3600));
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task HandleDeadLetterSideEffectsAsync(
        OutboxMessage message,
        CancellationToken cancellationToken)
    {
        if (message.MessageType != OutboxMessageTypes.CampaignRecipient)
        {
            return;
        }

        CampaignRecipientOutboxPayload? payload;
        try
        {
            payload = JsonSerializer.Deserialize<CampaignRecipientOutboxPayload>(message.PayloadJson);
        }
        catch (JsonException ex)
        {
            logger.LogWarning(
                ex,
                "Campaign recipient dead-letter payload is invalid for outbox message {MessageId}.",
                message.Id);
            return;
        }

        if (payload is null)
        {
            return;
        }

        var recipient = await dbContext.CampaignRecipients
            .Include(item => item.Campaign)
            .FirstOrDefaultAsync(
                item => item.Id == payload.RecipientId && item.CampaignId == payload.CampaignId,
                cancellationToken);

        if (recipient is null || recipient.Status != CampaignRecipientStatus.Queued)
        {
            return;
        }

        recipient.Status = CampaignRecipientStatus.Failed;
        recipient.FailureReason = message.LastError ?? "Outbox delivery failed.";
        recipient.Campaign.FailedCount++;
        await dbContext.SaveChangesAsync(cancellationToken);

        await TryFinalizeCampaignAsync(payload.CampaignId, cancellationToken);
    }

    private async Task TryFinalizeCampaignAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        var campaign = await dbContext.Campaigns
            .Include(item => item.Recipients)
            .FirstOrDefaultAsync(item => item.Id == campaignId, cancellationToken);

        if (campaign is null || campaign.Status is CampaignStatus.Completed or CampaignStatus.Failed)
        {
            return;
        }

        if (campaign.Recipients.Any(recipient => recipient.Status == CampaignRecipientStatus.Queued))
        {
            return;
        }

        campaign.Status = campaign.SentCount > 0 ? CampaignStatus.Completed : CampaignStatus.Failed;
        campaign.SentAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Campaign {CampaignId} finalized with status {Status} ({SentCount} sent, {FailedCount} failed, {SkippedCount} skipped).",
            campaign.Id,
            campaign.Status,
            campaign.SentCount,
            campaign.FailedCount,
            campaign.SkippedCount);
    }
}
