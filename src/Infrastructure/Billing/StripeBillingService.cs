using Cohestra.Application.Billing;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Site;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Seed;
using Cohestra.Infrastructure.Site;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;

namespace Cohestra.Infrastructure.Billing;

public sealed class StripeBillingService(
    CohestraDbContext dbContext,
    IPublishedSiteCache publishedSiteCache,
    IOptions<SiteLandingSeedSettings> landingSeedSettings,
    IOptions<StripeSettings> stripeOptions,
    ILogger<StripeBillingService> logger) : IBillingService
{
    private readonly StripeSettings _settings = stripeOptions.Value;

    public async Task<BillingSummaryDto> GetSummaryAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        return new BillingSummaryDto(
            tenant.Plan,
            tenant.BillingStatus,
            tenant.BillingInterval,
            tenant.TrialEndsAt,
            tenant.HasConsumedTrial,
            _settings.IsConfigured,
            string.IsNullOrWhiteSpace(_settings.PublishableKey) ? null : _settings.PublishableKey,
            _settings.TrialPeriodDays,
            tenant.IsComplimentary);
    }

    public async Task<CheckoutSessionDto> CreateCheckoutSessionAsync(
        CreateCheckoutSessionCommand command,
        CancellationToken cancellationToken = default)
    {
        if (!_settings.IsConfigured)
        {
            throw new InvalidOperationException("Stripe is not configured.");
        }

        if (command.Plan is not (TenantPlan.Core or TenantPlan.Pro))
        {
            throw new InvalidOperationException("Checkout is only available for Core or Pro plans.");
        }

        var priceId = StripeTenantBillingSync.ResolvePriceId(command.Plan, command.Interval, _settings)
            ?? throw new InvalidOperationException("Stripe price ID is not configured for the selected plan.");

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == command.TenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        if (tenant.IsComplimentary)
        {
            throw new InvalidOperationException("Complimentary tenants do not use Stripe Checkout.");
        }

        if (tenant.Plan is TenantPlan.Core or TenantPlan.Pro
            && tenant.BillingStatus is BillingStatus.Trialing or BillingStatus.Active or BillingStatus.PastDue)
        {
            throw new InvalidOperationException("Tenant already has an active paid subscription.");
        }

        if (!string.IsNullOrWhiteSpace(tenant.StripeSubscriptionId))
        {
            throw new InvalidOperationException("Tenant already has a Stripe subscription in progress.");
        }

        if (string.IsNullOrWhiteSpace(tenant.StripeCustomerId) && string.IsNullOrWhiteSpace(command.AdminEmail))
        {
            throw new InvalidOperationException("Admin email is required to start Checkout.");
        }

        StripeConfiguration.ApiKey = _settings.SecretKey;
        var sessionService = new SessionService();

        var includeTrial = !tenant.HasConsumedTrial;
        DateTimeOffset? projectedTrialEnd = includeTrial
            ? DateTimeOffset.UtcNow.AddDays(_settings.TrialPeriodDays)
            : null;

        var subscriptionData = new SessionSubscriptionDataOptions
        {
            Metadata = new Dictionary<string, string>
            {
                ["tenant_id"] = tenant.Id.ToString(),
                ["tenant_slug"] = command.TenantSlug,
                ["plan"] = command.Plan.ToString(),
                ["interval"] = command.Interval.ToString(),
            },
        };

        if (includeTrial)
        {
            subscriptionData.TrialPeriodDays = _settings.TrialPeriodDays;
        }

        var options = new SessionCreateOptions
        {
            Mode = "subscription",
            CustomerEmail = string.IsNullOrWhiteSpace(tenant.StripeCustomerId) ? command.AdminEmail : null,
            Customer = tenant.StripeCustomerId,
            LineItems =
            [
                new SessionLineItemOptions
                {
                    Price = priceId,
                    Quantity = 1,
                },
            ],
            SubscriptionData = subscriptionData,
            Metadata = new Dictionary<string, string>
            {
                ["tenant_id"] = tenant.Id.ToString(),
                ["tenant_slug"] = command.TenantSlug,
                ["plan"] = command.Plan.ToString(),
                ["interval"] = command.Interval.ToString(),
            },
            SuccessUrl = command.SuccessUrl,
            CancelUrl = command.CancelUrl,
            PaymentMethodCollection = "always",
        };

        Session session;
        try
        {
            session = await sessionService.CreateAsync(options, cancellationToken: cancellationToken);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(ex, "Stripe Checkout session creation failed for tenant {TenantId}", tenant.Id);
            throw new InvalidOperationException("Could not create Stripe Checkout session.");
        }

        if (string.IsNullOrWhiteSpace(session.Url))
        {
            throw new InvalidOperationException("Stripe Checkout session did not return a URL.");
        }

        var disclaimer = projectedTrialEnd is null
            ? "Your card will be charged immediately when you subscribe."
            : StripeTenantBillingSync.BuildTrialDisclaimer(projectedTrialEnd.Value);

        return new CheckoutSessionDto(
            session.Url,
            projectedTrialEnd,
            includeTrial,
            disclaimer);
    }

    public async Task<PortalSessionDto> CreatePortalSessionAsync(
        CreatePortalSessionCommand command,
        CancellationToken cancellationToken = default)
    {
        if (!_settings.IsConfigured)
        {
            throw new InvalidOperationException("Stripe is not configured.");
        }

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == command.TenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        if (tenant.IsComplimentary)
        {
            throw new InvalidOperationException("Complimentary tenants do not use Stripe Portal.");
        }

        if (string.IsNullOrWhiteSpace(tenant.StripeCustomerId))
        {
            throw new InvalidOperationException("Tenant has no Stripe customer yet.");
        }

        StripeConfiguration.ApiKey = _settings.SecretKey;
        var portalService = new Stripe.BillingPortal.SessionService();
        var session = await portalService.CreateAsync(
            new Stripe.BillingPortal.SessionCreateOptions
            {
                Customer = tenant.StripeCustomerId,
                ReturnUrl = command.ReturnUrl,
            },
            cancellationToken: cancellationToken);

        if (string.IsNullOrWhiteSpace(session.Url))
        {
            throw new InvalidOperationException("Stripe Portal session did not return a URL.");
        }

        return new PortalSessionDto(session.Url);
    }

    public async Task<BillingSummaryDto> SyncFromStripeAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        if (!_settings.IsConfigured)
        {
            return await GetSummaryAsync(tenantId, cancellationToken);
        }

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        if (string.IsNullOrWhiteSpace(tenant.StripeSubscriptionId))
        {
            return await GetSummaryAsync(tenantId, cancellationToken);
        }

        StripeConfiguration.ApiKey = _settings.SecretKey;
        var subscriptionService = new SubscriptionService();
        Subscription subscription;
        try
        {
            subscription = await subscriptionService.GetAsync(
                tenant.StripeSubscriptionId,
                cancellationToken: cancellationToken);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(
                ex,
                "Could not fetch Stripe subscription {SubscriptionId} for tenant {TenantId}",
                tenant.StripeSubscriptionId,
                tenantId);
            return await GetSummaryAsync(tenantId, cancellationToken);
        }

        StripeTenantBillingSync.ApplySubscription(tenant, subscription, _settings);
        await dbContext.SaveChangesAsync(cancellationToken);
        await EnsurePaidSitePageIfNeededAsync(tenant, cancellationToken);

        return await GetSummaryAsync(tenantId, cancellationToken);
    }

    private async Task EnsurePaidSitePageIfNeededAsync(
        Tenant tenant,
        CancellationToken cancellationToken)
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
}
