using System.Text.Json;
using Cohestra.Application.Outbox;
using Cohestra.Application.Registrations;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Outbox;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Outbox;

public sealed class RegistrationConfirmationOutboxHandler(
    CohestraDbContext dbContext,
    CurrentTenant currentTenant,
    IRegistrationNotificationService registrationNotificationService) : IOutboxMessageHandler
{
    public string MessageType => OutboxMessageTypes.RegistrationConfirmation;

    public async Task HandleAsync(OutboxMessage message, CancellationToken cancellationToken = default)
    {
        var payload = JsonSerializer.Deserialize<RegistrationConfirmationOutboxPayload>(message.PayloadJson)
            ?? throw new InvalidOperationException("Registration confirmation outbox payload is invalid.");

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == message.TenantId, cancellationToken)
            ?? throw new InvalidOperationException($"Tenant {message.TenantId} was not found for outbox message.");

        currentTenant.SetResolved(message.TenantId, tenant.Slug);

        var result = await registrationNotificationService.SendConfirmationIfApplicableAsync(
            payload.RegistrationId,
            cancellationToken);

        if (!result.Sent && result.RecipientEmail is not null)
        {
            throw new InvalidOperationException(
                $"Registration confirmation email was not sent for registration {payload.RegistrationId}.");
        }
    }
}
