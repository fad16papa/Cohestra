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
    };

    public async Task<PaddleWebhookProcessResult> ProcessAsync(
        string rawJson,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawJson))
        {
            return new PaddleWebhookProcessResult(false, false, "Missing payload.");
        }

        PaddleNotification? notification;
        try
        {
            notification = JsonSerializer.Deserialize<PaddleNotification>(rawJson, PaddleJson.Options);
        }
        catch (JsonException)
        {
            return new PaddleWebhookProcessResult(false, false, "Invalid JSON.");
        }

        var eventId = notification?.EventId ?? notification?.NotificationId ?? string.Empty;
        var eventType = notification?.EventType ?? string.Empty;
        if (string.IsNullOrWhiteSpace(eventId))
        {
            return new PaddleWebhookProcessResult(false, false, "Missing event id.");
        }

        var existing = await dbContext.PaddleWebhookEvents
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.EventId == eventId, cancellationToken);
        if (existing is not null)
        {
            return new PaddleWebhookProcessResult(false, true, "Duplicate event.");
        }

        if (!TrackedEventTypes.Contains(eventType))
        {
            return new PaddleWebhookProcessResult(false, false, "Ignored event type.");
        }

        var handled = eventType.ToLowerInvariant() switch
        {
            "transaction.completed" => await HandleTransactionCompletedAsync(notification!.Data, cancellationToken),
            "transaction.payment_failed" => await HandleTransactionPaymentFailedAsync(notification!.Data, cancellationToken),
            "subscription.created" or "subscription.updated" or "subscription.past_due" or "subscription.activated"
                => await HandleSubscriptionUpdatedAsync(notification!.Data, cancellationToken),
            "subscription.canceled" => await HandleSubscriptionCanceledAsync(notification!.Data, cancellationToken),
            _ => false,
        };

        if (!handled)
        {
            return new PaddleWebhookProcessResult(false, false, "Handler failed.");
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
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            logger.LogInformation(ex, "Concurrent webhook delivery for event {EventId}", eventId);
            return new PaddleWebhookProcessResult(false, true, "Duplicate event.");
        }

        return new PaddleWebhookProcessResult(true, false, "Processed.");
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
            await dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        if (string.IsNullOrWhiteSpace(transaction.SubscriptionId))
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            return !string.IsNullOrWhiteSpace(tenant.PaddleCustomerId);
        }

        try
        {
            var subscription = await paddleClient.GetSubscriptionAsync(transaction.SubscriptionId, cancellationToken);
            if (subscription is not null)
            {
                await ApplyLiveSubscriptionAsync(tenant, subscription, cancellationToken);
            }
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(
                ex,
                "Failed to fetch subscription {SubscriptionId} for transaction {TransactionId}",
                transaction.SubscriptionId,
                transaction.Id);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await EnsurePaidSitePageIfNeededAsync(tenant, cancellationToken);
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
        await dbContext.SaveChangesAsync(cancellationToken);
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
        await dbContext.SaveChangesAsync(cancellationToken);
        await EnsurePaidSitePageIfNeededAsync(tenant, cancellationToken);
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
        await dbContext.SaveChangesAsync(cancellationToken);
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

    private static bool IsUniqueViolation(DbUpdateException ex)
    {
        for (var inner = ex.InnerException; inner is not null; inner = inner.InnerException)
        {
            if (inner is PostgresException postgres && postgres.SqlState == PostgresErrorCodes.UniqueViolation)
            {
                return true;
            }
        }

        return false;
    }
}
