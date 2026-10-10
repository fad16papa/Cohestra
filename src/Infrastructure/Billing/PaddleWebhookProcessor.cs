using System.Text.Json;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Seed;
using Cohestra.Infrastructure.Site;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Cohestra.Infrastructure.Billing;

internal sealed class PaddleWebhookProcessor(
    CohestraDbContext dbContext,
    IPublishedSiteCache publishedSiteCache,
    IOptions<SiteLandingSeedSettings> landingSeedSettings,
    IOptions<PaddleSettings> paddleOptions,
    IPaddleApiClient paddleClient,
    ILogger<PaddleWebhookProcessor> logger) : IPaddleWebhookProcessor
{
    private readonly PaddleSettings _settings = paddleOptions.Value;

    private static readonly HashSet<string> TrackedEventTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "transaction.completed",
        "transaction.payment_failed",
        "subscription.created",
        "subscription.updated",
        "subscription.canceled",
        "subscription.past_due",
        "subscription.activated",
        "adjustment.created",
        "adjustment.updated",
    };

    public async Task<PaddleWebhookProcessResult> ProcessAsync(
        string rawJson,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawJson))
        {
            return PaddleWebhookProcessResult.Invalid("Missing payload.");
        }

        PaddleNotification? notification;
        try
        {
            notification = JsonSerializer.Deserialize<PaddleNotification>(rawJson, PaddleJson.Options);
        }
        catch (JsonException)
        {
            return PaddleWebhookProcessResult.Invalid("Invalid JSON.");
        }

        var eventId = notification?.EventId ?? notification?.NotificationId ?? string.Empty;
        var eventType = notification?.EventType ?? string.Empty;
        if (string.IsNullOrWhiteSpace(eventId))
        {
            return PaddleWebhookProcessResult.Invalid("Missing event id.") with
            {
                EventType = string.IsNullOrWhiteSpace(eventType) ? null : eventType,
            };
        }

        var existing = await dbContext.PaddleWebhookEvents
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.EventId == eventId, cancellationToken);
        if (existing is not null)
        {
            return PaddleWebhookProcessResult.DuplicateEvent() with
            {
                EventId = eventId,
                EventType = eventType,
            };
        }

        if (!TrackedEventTypes.Contains(eventType))
        {
            return PaddleWebhookProcessResult.Ignored("Ignored event type.") with
            {
                EventId = eventId,
                EventType = eventType,
            };
        }

        var handled = eventType.ToLowerInvariant() switch
        {
            "transaction.completed" => await HandleTransactionCompletedAsync(notification!.Data, cancellationToken),
            "transaction.payment_failed" => await HandleTransactionPaymentFailedAsync(notification!.Data, cancellationToken),
            "subscription.created" or "subscription.updated" or "subscription.past_due" or "subscription.activated"
                => await HandleSubscriptionUpdatedAsync(notification!.Data, cancellationToken),
            "subscription.canceled" => await HandleSubscriptionCanceledAsync(notification!.Data, cancellationToken),
            "adjustment.created" or "adjustment.updated"
                => await HandleAdjustmentAsync(notification!, cancellationToken),
            _ => false,
        };

        if (!handled)
        {
            return PaddleWebhookProcessResult.Retry("Handler failed.") with
            {
                EventId = eventId,
                EventType = eventType,
                TenantId = TrackedTenantId(),
            };
        }

        dbContext.PaddleWebhookEvents.Add(new PaddleWebhookEvent
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            EventType = eventType,
            ProcessedAt = DateTimeOffset.UtcNow,
        });

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex, out var constraint))
        {
            if (IsWebhookEventIdConstraint(constraint))
            {
                logger.LogInformation(ex, "Concurrent webhook delivery for event {EventId}", eventId);
                return PaddleWebhookProcessResult.DuplicateEvent() with
                {
                    EventId = eventId,
                    EventType = eventType,
                };
            }

            logger.LogInformation(ex, "Concurrent adjustment cursor write for event {EventId}", eventId);
            return PaddleWebhookProcessResult.Retry("Concurrent adjustment update.") with
            {
                EventId = eventId,
                EventType = eventType,
                TenantId = TrackedTenantId(),
            };
        }

        var tenantId = dbContext.ChangeTracker.Entries<Tenant>()
            .Select(entry => entry.Entity.Id)
            .FirstOrDefault();
        if (tenantId != Guid.Empty)
        {
            var tenant = await dbContext.Tenants.FirstOrDefaultAsync(item => item.Id == tenantId, cancellationToken);
            if (tenant is not null)
            {
                try
                {
                    await EnsurePaidSitePageIfNeededAsync(tenant, cancellationToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(
                        ex,
                        "Site page seed failed after webhook ledger commit for tenant {TenantId}",
                        tenant.Id);
                }
            }
        }

        return PaddleWebhookProcessResult.ProcessedOk() with
        {
            EventId = eventId,
            EventType = eventType,
            TenantId = TrackedTenantId(),
        };
    }

    private Guid? TrackedTenantId()
    {
        var tenantId = dbContext.ChangeTracker.Entries<Tenant>()
            .Select(entry => entry.Entity.Id)
            .FirstOrDefault();
        return tenantId == Guid.Empty ? null : tenantId;
    }

    private async Task<bool> HandleTransactionCompletedAsync(
        JsonElement data,
        CancellationToken cancellationToken)
    {
        var transaction = data.Deserialize<PaddleTransaction>(PaddleJson.Options);
        if (transaction is null)
        {
            return false;
        }

        var tenant = await ResolveTenantAsync(transaction.CustomData, transaction.CustomerId, cancellationToken);
        if (tenant is null)
        {
            logger.LogWarning(
                "transaction.completed without resolvable tenant for transaction {TransactionId}",
                transaction.Id);
            return false;
        }

        PaddleTenantBillingSync.ApplyTransaction(tenant, transaction);

        if (IsRenewalOrigin(transaction.Origin))
        {
            TenantBillingPlanSync.ApplyInvoicePaid(tenant);
            return true;
        }

        if (string.IsNullOrWhiteSpace(transaction.SubscriptionId))
        {
            return !string.IsNullOrWhiteSpace(tenant.PaddleCustomerId);
        }

        try
        {
            var subscription = await paddleClient.GetSubscriptionAsync(transaction.SubscriptionId, cancellationToken);
            if (subscription is null)
            {
                logger.LogWarning(
                    "transaction.completed missing subscription {SubscriptionId} for transaction {TransactionId}",
                    transaction.SubscriptionId,
                    transaction.Id);
                return false;
            }

            await ApplyLiveSubscriptionAsync(tenant, subscription, cancellationToken);
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(
                ex,
                "Failed to fetch subscription {SubscriptionId} for transaction {TransactionId}",
                transaction.SubscriptionId,
                transaction.Id);
            return false;
        }

        return !string.IsNullOrWhiteSpace(tenant.PaddleSubscriptionId);
    }

    private async Task<bool> HandleTransactionPaymentFailedAsync(
        JsonElement data,
        CancellationToken cancellationToken)
    {
        var transaction = data.Deserialize<PaddleTransaction>(PaddleJson.Options);
        if (transaction is null)
        {
            return false;
        }

        var tenant = await ResolveTenantAsync(transaction.CustomData, transaction.CustomerId, cancellationToken);
        if (tenant is null)
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(transaction.SubscriptionId)
            && tenant.PaddleSubscriptionId != transaction.SubscriptionId)
        {
            return false;
        }

        TenantBillingPlanSync.ApplyInvoicePaymentFailed(tenant);
        return true;
    }

    private async Task<bool> HandleSubscriptionUpdatedAsync(
        JsonElement data,
        CancellationToken cancellationToken)
    {
        var subscription = data.Deserialize<PaddleSubscription>(PaddleJson.Options);
        if (subscription is null)
        {
            return false;
        }

        var tenant = await ResolveTenantAsync(subscription.CustomData, subscription.CustomerId, cancellationToken);
        tenant ??= await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.PaddleSubscriptionId == subscription.Id, cancellationToken);

        if (tenant is null)
        {
            logger.LogWarning(
                "subscription event without resolvable tenant for subscription {SubscriptionId}",
                subscription.Id);
            return false;
        }

        await ApplyLiveSubscriptionAsync(tenant, subscription, cancellationToken);
        return true;
    }

    private async Task<bool> HandleSubscriptionCanceledAsync(
        JsonElement data,
        CancellationToken cancellationToken)
    {
        var subscription = data.Deserialize<PaddleSubscription>(PaddleJson.Options);
        if (subscription is null)
        {
            return false;
        }

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.PaddleSubscriptionId == subscription.Id, cancellationToken);
        tenant ??= await ResolveTenantAsync(subscription.CustomData, subscription.CustomerId, cancellationToken);

        if (tenant is null)
        {
            logger.LogWarning(
                "subscription.canceled without resolvable tenant for subscription {SubscriptionId}",
                subscription.Id);
            return false;
        }

        TenantBillingPlanSync.ApplySubscriptionDeleted(tenant);
        return true;
    }

    private async Task<bool> HandleAdjustmentAsync(
        PaddleNotification notification,
        CancellationToken cancellationToken)
    {
        var adjustment = notification.Data.Deserialize<PaddleAdjustment>(PaddleJson.Options);
        if (adjustment is null || string.IsNullOrWhiteSpace(adjustment.Id))
        {
            return false;
        }

        Tenant? tenant = null;
        if (!string.IsNullOrWhiteSpace(adjustment.SubscriptionId))
        {
            tenant = await dbContext.Tenants
                .FirstOrDefaultAsync(item => item.PaddleSubscriptionId == adjustment.SubscriptionId, cancellationToken);
        }

        tenant ??= await ResolveTenantAsync(default, adjustment.CustomerId, cancellationToken);

        if (tenant is null)
        {
            logger.LogWarning(
                "adjustment {AdjustmentId} without resolvable tenant for subscription {SubscriptionId}",
                adjustment.Id,
                adjustment.SubscriptionId);
            return false;
        }

        var occurredAt = notification.OccurredAt
            ?? adjustment.UpdatedAt
            ?? adjustment.CreatedAt
            ?? DateTimeOffset.UtcNow;
        var action = adjustment.Action?.Trim().ToLowerInvariant() ?? string.Empty;
        var status = adjustment.Status?.Trim().ToLowerInvariant() ?? string.Empty;

        var cursor = await dbContext.PaddleAdjustmentCursors
            .FirstOrDefaultAsync(item => item.AdjustmentId == adjustment.Id, cancellationToken);
        if (cursor is not null && cursor.OccurredAt >= occurredAt)
        {
            logger.LogInformation(
                "Ignoring stale Paddle adjustment {AdjustmentId} at {OccurredAt} (cursor {CursorOccurredAt} {CursorStatus})",
                adjustment.Id,
                occurredAt,
                cursor.OccurredAt,
                cursor.Status);
            return true;
        }

        if (cursor is null)
        {
            cursor = new PaddleAdjustmentCursor { AdjustmentId = adjustment.Id };
            dbContext.PaddleAdjustmentCursors.Add(cursor);
        }

        cursor.OccurredAt = occurredAt;
        cursor.Status = status;
        cursor.Action = action;

        if (tenant.IsComplimentary)
        {
            logger.LogInformation(
                "Ignoring Paddle adjustment {AdjustmentId} for complimentary tenant {TenantId}",
                adjustment.Id,
                tenant.Id);
            return true;
        }

        if (status is not "approved")
        {
            return true;
        }

        if (action is "chargeback")
        {
            TenantBillingPlanSync.ApplyInvoicePaymentFailed(tenant);
            logger.LogWarning(
                "Approved Paddle chargeback {AdjustmentId} started PastDue for tenant {TenantId}",
                adjustment.Id,
                tenant.Id);
            return true;
        }

        if (action is "refund")
        {
            logger.LogWarning(
                "Approved Paddle refund {AdjustmentId} for tenant {TenantId} subscription {SubscriptionId} left entitlements unchanged pending product refund policy",
                adjustment.Id,
                tenant.Id,
                adjustment.SubscriptionId);
            return true;
        }

        return true;
    }

    private async Task ApplyLiveSubscriptionAsync(
        Tenant tenant,
        PaddleSubscription subscription,
        CancellationToken cancellationToken)
    {
        var alreadyConsumed = tenant.HasConsumedTrial;
        if (alreadyConsumed)
        {
            var trialEnd = PaddleTenantBillingSync.ResolveTrialEnd(subscription);
            var stillTrialing = string.Equals(subscription.Status, "trialing", StringComparison.OrdinalIgnoreCase)
                || (trialEnd is { } end && end > DateTimeOffset.UtcNow);
            if (stillTrialing)
            {
                try
                {
                    subscription = await paddleClient.EndTrialNowAsync(subscription.Id, cancellationToken);
                }
                catch (PaddleApiException ex)
                {
                    logger.LogWarning(
                        ex,
                        "Could not end a repeat trial for tenant {TenantId} subscription {SubscriptionId}",
                        tenant.Id,
                        subscription.Id);
                }
            }
        }

        PaddleTenantBillingSync.ApplySubscription(tenant, subscription, _settings);
    }

    private async Task<Tenant?> ResolveTenantAsync(
        JsonElement customData,
        string? customerId,
        CancellationToken cancellationToken)
    {
        var data = PaddleJson.ReadCustomData(customData);
        if (PaddleJson.TryGetGuid(data, "tenant_id", out var tenantId))
        {
            var tenant = await dbContext.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
            if (tenant is null)
            {
                return null;
            }

            if (!string.IsNullOrWhiteSpace(customerId)
                && !string.IsNullOrWhiteSpace(tenant.PaddleCustomerId)
                && !string.Equals(tenant.PaddleCustomerId, customerId, StringComparison.Ordinal))
            {
                logger.LogWarning(
                    "Webhook customer {CustomerId} does not match tenant {TenantId} customer {TenantCustomerId}",
                    customerId,
                    tenant.Id,
                    tenant.PaddleCustomerId);
                return null;
            }

            return tenant;
        }

        if (string.IsNullOrWhiteSpace(customerId))
        {
            return null;
        }

        return await dbContext.Tenants.FirstOrDefaultAsync(t => t.PaddleCustomerId == customerId, cancellationToken);
    }

    private async Task EnsurePaidSitePageIfNeededAsync(Tenant tenant, CancellationToken cancellationToken)
    {
        if (tenant.Plan is not (TenantPlan.Core or TenantPlan.Pro))
        {
            return;
        }

        await SitePageCoreSeedHelper.EnsureCoreSitePageAsync(
            dbContext,
            publishedSiteCache,
            landingSeedSettings,
            logger,
            tenant.Id,
            tenant.Name,
            cancellationToken);
    }

    private static bool IsRenewalOrigin(string? origin) =>
        origin is "subscription_recurring" or "subscription_charge" or "subscription_update";

    private static bool IsUniqueViolation(DbUpdateException ex, out string? constraintName)
    {
        constraintName = null;
        for (var inner = ex.InnerException; inner is not null; inner = inner.InnerException)
        {
            if (inner is PostgresException postgres && postgres.SqlState == PostgresErrorCodes.UniqueViolation)
            {
                constraintName = postgres.ConstraintName;
                return true;
            }
        }

        return false;
    }

    private static bool IsWebhookEventIdConstraint(string? constraintName) =>
        string.IsNullOrWhiteSpace(constraintName)
        || constraintName.Contains("paddle_webhook_events", StringComparison.OrdinalIgnoreCase)
        || constraintName.Contains("EventId", StringComparison.OrdinalIgnoreCase);
}
