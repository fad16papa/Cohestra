using System.Text.Json;
using Cohestra.Application.Email;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Outbox;

public sealed class BillingNotificationOutboxHandler(
    CohestraDbContext dbContext,
    IEmailSender emailSender) : IOutboxMessageHandler
{
    public string MessageType => OutboxMessageTypes.BillingNotification;

    public async Task HandleAsync(OutboxMessage message, CancellationToken cancellationToken = default)
    {
        var payload = JsonSerializer.Deserialize<BillingNotificationOutboxPayload>(message.PayloadJson)
            ?? throw new InvalidOperationException("Billing notification outbox payload is invalid.");

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(item => item.Id == payload.TenantId, cancellationToken)
            ?? throw new InvalidOperationException($"Tenant {payload.TenantId} was not found for billing outbox message.");

        var sendResult = await emailSender.SendAsync(
            new EmailMessage(
                payload.ToEmail,
                null,
                payload.Subject,
                payload.PlainBody,
                payload.HtmlBody),
            cancellationToken);

        if (!sendResult.Success)
        {
            throw new InvalidOperationException(sendResult.FailureReason ?? "Billing notification email failed.");
        }

        var now = DateTimeOffset.UtcNow;
        switch (payload.NoticeType)
        {
            case BillingNotificationNoticeTypes.TrialReminder:
                tenant.LastTrialReminderSentAt = now;
                break;
            case BillingNotificationNoticeTypes.PastDue:
                tenant.LastPastDueNoticeAt = now;
                break;
            case BillingNotificationNoticeTypes.OnHold:
                tenant.LastOnHoldNoticeAt = now;
                break;
            case BillingNotificationNoticeTypes.Dormancy:
                tenant.LastDormancyWarningAt = now;
                break;
            default:
                throw new InvalidOperationException($"Unknown billing notice type '{payload.NoticeType}'.");
        }

        tenant.UpdatedAt = now;
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
