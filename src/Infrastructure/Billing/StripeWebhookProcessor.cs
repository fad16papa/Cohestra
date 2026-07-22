using Cohestra.Domain.Billing;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;

namespace Cohestra.Infrastructure.Billing;

public sealed class StripeWebhookProcessor(
    CohestraDbContext dbContext,
    IOptions<StripeSettings> stripeOptions,
    ILogger<StripeWebhookProcessor> logger) : IStripeWebhookProcessor
{
    private readonly StripeSettings _settings = stripeOptions.Value;

    private static readonly HashSet<string> TrackedEventTypes =
    [
        EventTypes.CheckoutSessionCompleted,
        EventTypes.CustomerSubscriptionUpdated,
        EventTypes.CustomerSubscriptionDeleted,
        EventTypes.InvoicePaid,
        EventTypes.InvoicePaymentFailed,
    ];

    public async Task<StripeWebhookProcessResult> ProcessAsync(
        Event stripeEvent,
        CancellationToken cancellationToken = default)
    {
        var existing = await dbContext.StripeWebhookEvents
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.EventId == stripeEvent.Id, cancellationToken);

        if (existing is not null)
        {
            return new StripeWebhookProcessResult(false, true, "Duplicate event.");
        }

        if (!TrackedEventTypes.Contains(stripeEvent.Type))
        {
            return new StripeWebhookProcessResult(false, false, "Ignored event type.");
        }

        var handled = stripeEvent.Type switch
        {
            EventTypes.CheckoutSessionCompleted => await HandleCheckoutSessionCompletedAsync(stripeEvent, cancellationToken),
            EventTypes.CustomerSubscriptionUpdated => await HandleSubscriptionUpdatedAsync(stripeEvent, cancellationToken),
            EventTypes.CustomerSubscriptionDeleted => await HandleSubscriptionDeletedAsync(stripeEvent, cancellationToken),
            EventTypes.InvoicePaid => await HandleInvoicePaidAsync(stripeEvent, cancellationToken),
            EventTypes.InvoicePaymentFailed => await HandleInvoicePaymentFailedAsync(stripeEvent, cancellationToken),
            _ => false,
        };

        if (!handled)
        {
            return new StripeWebhookProcessResult(false, false, "Handler failed.");
        }

        dbContext.StripeWebhookEvents.Add(new StripeWebhookEvent
        {
            Id = Guid.NewGuid(),
            EventId = stripeEvent.Id,
            EventType = stripeEvent.Type,
            ProcessedAt = DateTimeOffset.UtcNow,
        });

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex)
        {
            logger.LogInformation(ex, "Concurrent webhook delivery for event {EventId}", stripeEvent.Id);
            return new StripeWebhookProcessResult(false, true, "Duplicate event.");
        }

        return new StripeWebhookProcessResult(true, false, null);
    }

    private async Task<bool> HandleCheckoutSessionCompletedAsync(
        Event stripeEvent,
        CancellationToken cancellationToken)
    {
        if (stripeEvent.Data.Object is not Session session)
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(session.SubscriptionId))
        {
            logger.LogWarning(
                "checkout.session.completed without subscription for session {SessionId}",
                session.Id);
            return false;
        }

        var tenant = await ResolveTenantFromMetadataAsync(session.Metadata, session.CustomerId, cancellationToken);
        if (tenant is null)
        {
            logger.LogWarning("checkout.session.completed without resolvable tenant for session {SessionId}", session.Id);
            return false;
        }

        StripeTenantBillingSync.ApplyCheckoutSession(tenant, session, _settings);

        if (string.IsNullOrWhiteSpace(_settings.SecretKey))
        {
            logger.LogWarning("Stripe secret key missing; cannot fetch subscription {SubscriptionId}", session.SubscriptionId);
            return false;
        }

        try
        {
            StripeConfiguration.ApiKey = _settings.SecretKey;
            var subscriptionService = new SubscriptionService();
            var subscription = await subscriptionService.GetAsync(session.SubscriptionId, cancellationToken: cancellationToken);
            StripeTenantBillingSync.ApplySubscription(tenant, subscription, _settings);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(ex, "Failed to fetch subscription {SubscriptionId} for checkout session {SessionId}",
                session.SubscriptionId, session.Id);
            return false;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<bool> HandleSubscriptionUpdatedAsync(
        Event stripeEvent,
        CancellationToken cancellationToken)
    {
        if (stripeEvent.Data.Object is not Subscription subscription)
        {
            return false;
        }

        var tenant = await ResolveTenantFromMetadataAsync(
            subscription.Metadata,
            subscription.CustomerId,
            cancellationToken);

        tenant ??= await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.StripeSubscriptionId == subscription.Id, cancellationToken);

        if (tenant is null)
        {
            logger.LogWarning("customer.subscription.updated without resolvable tenant for subscription {SubscriptionId}", subscription.Id);
            return false;
        }

        StripeTenantBillingSync.ApplySubscription(tenant, subscription, _settings);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<bool> HandleSubscriptionDeletedAsync(
        Event stripeEvent,
        CancellationToken cancellationToken)
    {
        if (stripeEvent.Data.Object is not Subscription subscription)
        {
            return false;
        }

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.StripeSubscriptionId == subscription.Id, cancellationToken);

        if (tenant is null)
        {
            logger.LogWarning("customer.subscription.deleted without resolvable tenant for subscription {SubscriptionId}", subscription.Id);
            return false;
        }

        StripeTenantBillingSync.ApplySubscriptionDeleted(tenant);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<bool> HandleInvoicePaidAsync(
        Event stripeEvent,
        CancellationToken cancellationToken)
    {
        if (stripeEvent.Data.Object is not Invoice invoice)
        {
            return false;
        }

        var tenant = await ResolveTenantFromCustomerIdAsync(invoice.CustomerId, cancellationToken);
        if (tenant is null)
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(GetInvoiceSubscriptionId(invoice))
            && tenant.StripeSubscriptionId != GetInvoiceSubscriptionId(invoice))
        {
            return false;
        }

        StripeTenantBillingSync.ApplyInvoicePaid(tenant);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<bool> HandleInvoicePaymentFailedAsync(
        Event stripeEvent,
        CancellationToken cancellationToken)
    {
        if (stripeEvent.Data.Object is not Invoice invoice)
        {
            return false;
        }

        var tenant = await ResolveTenantFromCustomerIdAsync(invoice.CustomerId, cancellationToken);
        if (tenant is null)
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(GetInvoiceSubscriptionId(invoice))
            && tenant.StripeSubscriptionId != GetInvoiceSubscriptionId(invoice))
        {
            return false;
        }

        StripeTenantBillingSync.ApplyInvoicePaymentFailed(tenant);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<Domain.Tenants.Tenant?> ResolveTenantFromMetadataAsync(
        IReadOnlyDictionary<string, string>? metadata,
        string? customerId,
        CancellationToken cancellationToken)
    {
        if (metadata is not null
            && metadata.TryGetValue("tenant_id", out var tenantIdRaw)
            && Guid.TryParse(tenantIdRaw, out var tenantId))
        {
            var tenant = await dbContext.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
            if (tenant is null)
            {
                return null;
            }

            if (!string.IsNullOrWhiteSpace(customerId)
                && !string.IsNullOrWhiteSpace(tenant.StripeCustomerId)
                && !string.Equals(tenant.StripeCustomerId, customerId, StringComparison.Ordinal))
            {
                logger.LogWarning(
                    "Webhook customer {CustomerId} does not match tenant {TenantId} customer {TenantCustomerId}",
                    customerId,
                    tenant.Id,
                    tenant.StripeCustomerId);
                return null;
            }

            return tenant;
        }

        return await ResolveTenantFromCustomerIdAsync(customerId, cancellationToken);
    }

    private Task<Domain.Tenants.Tenant?> ResolveTenantFromCustomerIdAsync(
        string? customerId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(customerId))
        {
            return Task.FromResult<Domain.Tenants.Tenant?>(null);
        }

        return dbContext.Tenants.FirstOrDefaultAsync(t => t.StripeCustomerId == customerId, cancellationToken);
    }

    private static string? GetInvoiceSubscriptionId(Invoice invoice) =>
        invoice.Parent?.SubscriptionDetails?.SubscriptionId;
}
