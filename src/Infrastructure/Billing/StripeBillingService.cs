using Cohestra.Application.Billing;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;

namespace Cohestra.Infrastructure.Billing;

public sealed class StripeBillingService(
    CohestraDbContext dbContext,
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
}
