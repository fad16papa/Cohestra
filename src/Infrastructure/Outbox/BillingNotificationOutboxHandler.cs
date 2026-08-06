using System.Text.Json;
using Cohestra.Application.Email;
using Cohestra.Domain.Outbox;
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
        if (message.DispatchedAt is not null)
        {
            return;
        }

        var payload = JsonSerializer.Deserialize<BillingNotificationOutboxPayload>(message.PayloadJson)
            ?? throw new InvalidOperationException("Billing notification outbox payload is invalid.");

        var tenantExists = await dbContext.Tenants
            .AsNoTracking()
            .AnyAsync(item => item.Id == payload.TenantId, cancellationToken);

        if (!tenantExists)
        {
            throw new InvalidOperationException($"Tenant {payload.TenantId} was not found for billing outbox message.");
        }

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

        message.DispatchedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
