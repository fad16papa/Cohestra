using System.Text.Json;
using Cohestra.Application.Email;
using Cohestra.Domain.Outbox;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Outbox;

public sealed class ActivityExpiredOutboxHandler(
    CohestraDbContext dbContext,
    IEmailSender emailSender) : IOutboxMessageHandler
{
    public string MessageType => OutboxMessageTypes.ActivityExpired;

    public async Task HandleAsync(OutboxMessage message, CancellationToken cancellationToken = default)
    {
        if (message.DispatchedAt is not null)
        {
            return;
        }

        var payload = JsonSerializer.Deserialize<ActivityExpiredOutboxPayload>(message.PayloadJson)
            ?? throw new InvalidOperationException("Activity expired outbox payload is invalid.");

        var recipientEmail = payload.ResolveRecipientEmail();

        var activityExists = await dbContext.Activities
            .IgnoreQueryFilters()
            .AsNoTracking()
            .AnyAsync(item => item.Id == payload.ActivityId, cancellationToken);

        if (!activityExists)
        {
            throw new InvalidOperationException($"Activity {payload.ActivityId} was not found for expired notification.");
        }

        var email = ActivityExpiredEmailBuilder.Build(
            payload.ActivityName,
            payload.Schedule,
            payload.TenantName,
            payload.ArchivedAtUtc);

        var sendResult = await emailSender.SendAsync(
            new EmailMessage(
                recipientEmail,
                null,
                email.Subject,
                email.PlainBody,
                email.HtmlBody,
                InlineAttachments: ActivityExpiredEmailBuilder.BuildInlineAttachments()),
            cancellationToken);

        if (!sendResult.Success)
        {
            throw new InvalidOperationException(sendResult.FailureReason ?? "Activity expired email failed.");
        }

        message.DispatchedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
