using System.Text.Json;
using Cohestra.Application.Clients;
using Cohestra.Domain.Campaigns;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Registrations;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.WebsiteInquiries;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Clients;

public sealed class ClientErasureService(CohestraDbContext dbContext) : IClientErasureService
{
    public async Task<ClientErasureResult> EraseAsync(
        Guid tenantId,
        Guid clientId,
        Guid actorUserId,
        string reason,
        CancellationToken cancellationToken = default)
    {
        if (tenantId == Guid.Empty || clientId == Guid.Empty || actorUserId == Guid.Empty)
        {
            return ClientErasureResult.Fail(ClientErasureError.Validation, "Tenant, client, and actor are required.");
        }

        if (string.IsNullOrWhiteSpace(reason))
        {
            return ClientErasureResult.Fail(ClientErasureError.Validation, "An erasure reason is required.");
        }

        var trimmedReason = reason.Trim();
        if (trimmedReason.Length < 8 || trimmedReason.Length > 500)
        {
            return ClientErasureResult.Fail(
                ClientErasureError.Validation,
                "Erasure reason must be 8 to 500 characters.");
        }

        var tenantExists = await dbContext.Tenants
            .AsNoTracking()
            .AnyAsync(tenant => tenant.Id == tenantId, cancellationToken);
        if (!tenantExists)
        {
            return ClientErasureResult.Fail(ClientErasureError.NotFound, "Tenant not found.");
        }

        var relational = dbContext.Database.IsRelational();
        await using var transaction = relational
            ? await dbContext.Database.BeginTransactionAsync(cancellationToken)
            : null;

        if (relational)
        {
            await WebsiteInquiryOutboxIdentity.LockDispatchAsync(
                dbContext.Database,
                tenantId,
                clientId,
                cancellationToken);
        }

        var client = await dbContext.IgnoreTenantFilters<Client>()
            .FirstOrDefaultAsync(row => row.Id == clientId, cancellationToken);
        if (client is null || client.TenantId != tenantId)
        {
            return ClientErasureResult.Fail(ClientErasureError.NotFound, "Client not found in this workspace.");
        }

        var registrations = await dbContext.IgnoreTenantFilters<Registration>()
            .Where(row => row.TenantId == tenantId && row.ClientId == clientId)
            .ToListAsync(cancellationToken);
        var timeline = await dbContext.IgnoreTenantFilters<ClientTimelineEvent>()
            .Where(row => row.TenantId == tenantId && row.ClientId == clientId)
            .ToListAsync(cancellationToken);
        var recipients = await dbContext.IgnoreTenantFilters<CampaignRecipient>()
            .Where(row => row.TenantId == tenantId && row.ClientId == clientId)
            .ToListAsync(cancellationToken);
        var inquiryNotifications = await LoadInquiryNotificationsAsync(
            relational,
            tenantId,
            cancellationToken);
        var removedNotifications = 0;
        var redactedNotifications = 0;
        foreach (var message in inquiryNotifications)
        {
            if (!WebsiteInquiryOutboxIdentity.MatchesClient(message, tenantId, clientId))
            {
                continue;
            }

            if (message.Status == OutboxMessageStatus.Pending)
            {
                dbContext.OutboxMessages.Remove(message);
                removedNotifications++;
                continue;
            }

            var timelineEventId = WebsiteInquiryOutboxIdentity.TryReadTimelineEventId(
                message.PayloadJson,
                out var parsedTimelineId)
                ? parsedTimelineId
                : Guid.Empty;
            message.PayloadJson = WebsiteInquiryOutboxIdentity.RedactedPayload(clientId, timelineEventId);
            redactedNotifications++;
            if (message.Status == OutboxMessageStatus.Processing)
            {
                message.Status = OutboxMessageStatus.Completed;
                message.ProcessedAt = DateTimeOffset.UtcNow;
                message.ClaimedAt = null;
            }
        }

        dbContext.RemoveRange(registrations);
        dbContext.RemoveRange(timeline);
        dbContext.RemoveRange(recipients);
        dbContext.Remove(client);
        dbContext.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.CreateVersion7(),
            ActorUserId = actorUserId,
            TenantId = tenantId,
            Action = PlatformAuditAction.ClientErased,
            Reason = trimmedReason,
            DetailsJson = JsonSerializer.Serialize(new
            {
                clientId,
                registrations = registrations.Count,
                timelineEvents = timeline.Count,
                campaignRecipients = recipients.Count,
                inquiryNotificationsRemoved = removedNotifications,
                inquiryNotificationsRedacted = redactedNotifications,
            }),
            CreatedAt = DateTimeOffset.UtcNow,
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        return ClientErasureResult.Ok(new ClientErasureCounts(
            registrations.Count,
            timeline.Count,
            recipients.Count));
    }

    private async Task<List<OutboxMessage>> LoadInquiryNotificationsAsync(
        bool relational,
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var messageType = OutboxMessageTypes.WebsiteInquiryOperatorNotify;
        if (!relational)
        {
            return await dbContext.OutboxMessages
                .Where(row => row.TenantId == tenantId && row.MessageType == messageType)
                .ToListAsync(cancellationToken);
        }

        return await dbContext.OutboxMessages
            .FromSqlInterpolated($"""
                SELECT *
                FROM public.outbox_messages
                WHERE "TenantId" = {tenantId}
                  AND "MessageType" = {messageType}
                FOR UPDATE
                """)
            .ToListAsync(cancellationToken);
    }
}
