using System.Text.Json;
using Cohestra.Application.Email;
using Cohestra.Domain.Outbox;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Outbox;

public sealed class ActivityExpiringSoonOutboxHandler(
    CohestraDbContext dbContext,
    IEmailSender emailSender) : IOutboxMessageHandler
{
    public string MessageType => OutboxMessageTypes.ActivityExpiringSoon;

    public async Task HandleAsync(OutboxMessage message, CancellationToken cancellationToken = default)
    {
        if (message.DispatchedAt is not null)
        {
            return;
        }

        var payload = JsonSerializer.Deserialize<ActivityExpiringSoonOutboxPayload>(message.PayloadJson)
            ?? throw new InvalidOperationException("Activity expiring-soon outbox payload is invalid.");

        var activityExists = await dbContext.Activities
            .IgnoreQueryFilters()
            .AsNoTracking()
            .AnyAsync(
                item => item.Id == payload.ActivityId && item.Status == Domain.Activities.ActivityStatus.Published,
                cancellationToken);

        if (!activityExists)
        {
            message.DispatchedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        var email = ActivityExpiringSoonEmailBuilder.Build(
            payload.ActivityName,
            payload.Schedule,
            payload.TenantName,
            payload.EventEndsAtUtc);

        var sendResult = await emailSender.SendAsync(
            new EmailMessage(
                payload.RecipientEmail,
                null,
                email.Subject,
                email.PlainBody,
                email.HtmlBody,
                InlineAttachments: ActivityExpiringSoonEmailBuilder.BuildInlineAttachments()),
            cancellationToken);

        if (!sendResult.Success)
        {
            throw new InvalidOperationException(sendResult.FailureReason ?? "Activity expiring-soon email failed.");
        }

        message.DispatchedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
