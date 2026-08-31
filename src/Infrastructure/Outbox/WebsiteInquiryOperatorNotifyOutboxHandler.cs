using System.Text.Json;
using Cohestra.Application.Outbox;
using Cohestra.Application.WebsiteInquiries;
using Cohestra.Domain.Outbox;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Cohestra.Infrastructure.WebsiteInquiries;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Outbox;

public sealed class WebsiteInquiryOperatorNotifyOutboxHandler(
    CohestraDbContext dbContext,
    CurrentTenant currentTenant,
    IWebsiteInquiryOperatorNotifyService websiteInquiryOperatorNotifyService) : IOutboxMessageHandler
{
    public string MessageType => OutboxMessageTypes.WebsiteInquiryOperatorNotify;

    public async Task HandleAsync(OutboxMessage message, CancellationToken cancellationToken = default)
    {
        var payload = JsonSerializer.Deserialize<WebsiteInquiryOperatorNotifyOutboxPayload>(message.PayloadJson)
            ?? throw new InvalidOperationException("Website inquiry operator notify outbox payload is invalid.");

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == message.TenantId, cancellationToken)
            ?? throw new InvalidOperationException($"Tenant {message.TenantId} was not found for outbox message.");

        currentTenant.SetResolved(message.TenantId, tenant.Slug);

        var result = await websiteInquiryOperatorNotifyService.SendOperatorNotifyIfApplicableAsync(
            new WebsiteInquiryOperatorNotifyRequest(
                payload.ClientId,
                payload.TimelineEventId,
                payload.ParticipantName,
                payload.Phone,
                payload.Email,
                payload.Message),
            cancellationToken);

        if (!result.Sent && result.RecipientEmail is not null)
        {
            throw new InvalidOperationException(
                $"Website inquiry operator notify email was not sent for client {payload.ClientId}.");
        }
    }
}
