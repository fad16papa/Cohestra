using System.Text.Json;
using Cohestra.Application.Outbox;
using Cohestra.Application.Registrations;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Outbox;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Outbox;

public sealed class RegistrationOperatorNotifyOutboxHandler(
    CohestraDbContext dbContext,
    CurrentTenant currentTenant,
    IRegistrationOperatorNotifyService registrationOperatorNotifyService) : IOutboxMessageHandler
{
    public string MessageType => OutboxMessageTypes.RegistrationOperatorNotify;

    public async Task HandleAsync(OutboxMessage message, CancellationToken cancellationToken = default)
    {
        var payload = JsonSerializer.Deserialize<RegistrationOperatorNotifyOutboxPayload>(message.PayloadJson)
            ?? throw new InvalidOperationException("Registration operator notify outbox payload is invalid.");

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == message.TenantId, cancellationToken)
            ?? throw new InvalidOperationException($"Tenant {message.TenantId} was not found for outbox message.");

        currentTenant.SetResolved(message.TenantId, tenant.Slug);

        var result = await registrationOperatorNotifyService.SendOperatorNotifyIfApplicableAsync(
            payload.RegistrationId,
            cancellationToken);

        if (!result.Sent && result.RecipientEmail is not null)
        {
            throw new InvalidOperationException(
                $"Registration operator notify email was not sent for registration {payload.RegistrationId}.");
        }
    }
}
