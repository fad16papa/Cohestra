using Cohestra.Application.Billing;
using Cohestra.Application.Outbox;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Site;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Registrations;
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
    ITenantAccessService tenantAccessService,
    IOutboxPublisher outboxPublisher,
    IOptions<PublicWebOptions> publicWebOptions,
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

        var usage = await tenantAccessService.GetUsageAsync(tenantId, cancellationToken);
        var coreLimits = TenantPlanLimits.For(TenantPlan.Core);
        var proLimits = TenantPlanLimits.For(TenantPlan.Pro);

        return new BillingSummaryDto(
            tenant.Plan,
            tenant.BillingStatus,
            tenant.BillingInterval,
            tenant.TrialEndsAt,
            tenant.HasConsumedTrial,
            _settings.IsConfigured,
            string.IsNullOrWhiteSpace(_settings.PublishableKey) ? null : _settings.PublishableKey,
            _settings.TrialPeriodDays,
            tenant.IsComplimentary,
            new BillingUsageDto(
                usage.SeatsUsed,
                usage.Communities,
                usage.PublishedActivities,
                usage.RegistrationsThisMonth),
            MapPlanLimits(coreLimits),
            MapPlanLimits(proLimits),
            tenant.ScheduledPlan is TenantPlan.Basic ? null : tenant.ScheduledPlan,
            tenant.ScheduledPlanEffectiveAt,
            tenant.ScheduledBillingInterval);
    }

    private static BillingPlanLimitsDto MapPlanLimits(PlanLimits limits) =>
        new(limits.Seats, limits.Communities, limits.PublishedActivities, limits.RegistrationsPerMonth);

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

        if (CanUpgradeExistingSubscription(tenant))
        {
            return await UpgradeExistingSubscriptionAsync(tenant, command, cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(tenant.StripeSubscriptionId))
        {
            throw new InvalidOperationException("Tenant already has a Stripe subscription in progress.");
        }

        StripeConfiguration.ApiKey = _settings.SecretKey;

        if (string.IsNullOrWhiteSpace(tenant.StripeCustomerId))
        {
            if (string.IsNullOrWhiteSpace(command.AdminEmail))
            {
                throw new InvalidOperationException("Admin email is required to start Checkout.");
            }

            await EnsureStripeCustomerForOperatorAsync(tenant, command.AdminEmail, cancellationToken);
        }

        var savedPaymentMethod = await FetchDefaultPaymentMethodAsync(
            tenant.StripeCustomerId!,
            cancellationToken);
        if (savedPaymentMethod is not null)
        {
            return await SubscribeWithSavedPaymentMethodAsync(
                tenant,
                command,
                priceId,
                savedPaymentMethod,
                cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(tenant.StripeCustomerId) && string.IsNullOrWhiteSpace(command.AdminEmail))
        {
            throw new InvalidOperationException("Admin email is required to start Checkout.");
        }

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
            PaymentMethodCollection = "if_required",
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

    private static bool CanUpgradeExistingSubscription(Tenant tenant) =>
        !string.IsNullOrWhiteSpace(tenant.StripeSubscriptionId)
        && tenant.Plan is TenantPlan.Core or TenantPlan.Pro
        && tenant.BillingStatus is BillingStatus.Trialing
            or BillingStatus.Active
            or BillingStatus.PastDue;

    private async Task<CheckoutSessionDto> UpgradeExistingSubscriptionAsync(
        Tenant tenant,
        CreateCheckoutSessionCommand command,
        CancellationToken cancellationToken)
    {
        if (StripeTenantBillingSync.ShouldDeferPlanChange(
                tenant.Plan,
                tenant.BillingInterval,
                command.Plan,
                command.Interval))
        {
            return await ScheduleDowngradeExistingSubscriptionAsync(
                tenant,
                command,
                cancellationToken);
        }

        if (StripeSubscriptionDowngradeScheduler.HasActiveScheduledPaidDowngrade(tenant))
        {
            throw new InvalidOperationException(
                "A plan change is already scheduled. Undo it on the checkout page or in Settings → Billing before choosing a different plan.");
        }

        var newPriceId = StripeTenantBillingSync.ResolvePriceId(command.Plan, command.Interval, _settings)
            ?? throw new InvalidOperationException("Stripe price ID is not configured for the selected plan.");

        StripeConfiguration.ApiKey = _settings.SecretKey;
        var subscriptionService = new SubscriptionService();

        Subscription subscription;
        try
        {
            subscription = await subscriptionService.GetAsync(
                tenant.StripeSubscriptionId!,
                cancellationToken: cancellationToken);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(
                ex,
                "Could not load Stripe subscription {SubscriptionId} for tenant {TenantId}",
                tenant.StripeSubscriptionId,
                tenant.Id);
            throw new InvalidOperationException(
                "Could not load your current subscription. Open Settings → Billing and try again.");
        }

        var currentItem = subscription.Items?.Data?.FirstOrDefault()
            ?? throw new InvalidOperationException("Stripe subscription has no billable items.");

        if (string.Equals(currentItem.Price?.Id, newPriceId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Your workspace is already on the selected plan and billing interval.");
        }

        Subscription updated;
        try
        {
            updated = await subscriptionService.UpdateAsync(
                subscription.Id,
                new SubscriptionUpdateOptions
                {
                    Items =
                    [
                        new SubscriptionItemOptions
                        {
                            Id = currentItem.Id,
                            Price = newPriceId,
                        },
                    ],
                    Metadata = new Dictionary<string, string>
                    {
                        ["tenant_id"] = tenant.Id.ToString(),
                        ["tenant_slug"] = command.TenantSlug,
                        ["plan"] = command.Plan.ToString(),
                        ["interval"] = command.Interval.ToString(),
                    },
                    ProrationBehavior = "create_prorations",
                },
                cancellationToken: cancellationToken);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(ex, "Stripe subscription upgrade failed for tenant {TenantId}", tenant.Id);
            throw new InvalidOperationException(
                "Could not update your subscription. Open Settings → Billing and try again.");
        }

        StripeTenantBillingSync.ApplySubscription(tenant, updated, _settings);
        await dbContext.SaveChangesAsync(cancellationToken);
        await EnsurePaidSitePageIfNeededAsync(tenant, cancellationToken);

        var disclaimer = tenant.BillingStatus == BillingStatus.Trialing && tenant.TrialEndsAt is { } trialEnd
            ? StripeTenantBillingSync.BuildTrialDisclaimer(trialEnd)
            : "Your plan was updated. Stripe will prorate any price difference on your next invoice.";

        return new CheckoutSessionDto(
            BuildInAppSuccessUrl(command.SuccessUrl, disclaimer),
            tenant.TrialEndsAt,
            tenant.BillingStatus == BillingStatus.Trialing,
            disclaimer,
            CompletedInApp: true);
    }

    private async Task<CheckoutSessionDto> ScheduleDowngradeExistingSubscriptionAsync(
        Tenant tenant,
        CreateCheckoutSessionCommand command,
        CancellationToken cancellationToken)
    {
        if (StripeSubscriptionDowngradeScheduler.HasActiveScheduledPaidDowngrade(tenant))
        {
            throw new InvalidOperationException(
                "A plan change is already scheduled. Undo it on the checkout page or in Settings → Billing before choosing a different plan.");
        }

        var newPriceId = StripeTenantBillingSync.ResolvePriceId(command.Plan, command.Interval, _settings)
            ?? throw new InvalidOperationException("Stripe price ID is not configured for the selected plan.");

        StripeConfiguration.ApiKey = _settings.SecretKey;
        var subscriptionService = new SubscriptionService();

        Subscription subscription;
        try
        {
            subscription = await subscriptionService.GetAsync(
                tenant.StripeSubscriptionId!,
                cancellationToken: cancellationToken);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(
                ex,
                "Could not load Stripe subscription {SubscriptionId} for tenant {TenantId}",
                tenant.StripeSubscriptionId,
                tenant.Id);
            throw new InvalidOperationException(
                "Could not load your current subscription. Open Settings → Billing and try again.");
        }

        var currentItem = subscription.Items?.Data?.FirstOrDefault()
            ?? throw new InvalidOperationException("Stripe subscription has no billable items.");

        var currentPriceId = currentItem.Price?.Id
            ?? throw new InvalidOperationException("Stripe subscription item has no price.");

        if (string.Equals(currentPriceId, newPriceId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Your workspace is already on the selected plan and billing interval.");
        }

        var periodEnd = StripeTenantBillingSync.ResolvePeriodEnd(subscription)
            ?? throw new InvalidOperationException(
                "Could not determine when your current billing period ends. Open Settings → Billing and try again.");

        SubscriptionSchedule schedule;
        try
        {
            schedule = await StripeSubscriptionDowngradeScheduler.SchedulePaidDowngradeAtPeriodEndAsync(
                subscription,
                currentPriceId,
                newPriceId,
                new Dictionary<string, string>
                {
                    ["tenant_id"] = tenant.Id.ToString(),
                    ["tenant_slug"] = command.TenantSlug,
                    ["plan"] = command.Plan.ToString(),
                    ["interval"] = command.Interval.ToString(),
                    ["scheduled_plan"] = command.Plan.ToString(),
                    ["scheduled_interval"] = command.Interval.ToString(),
                },
                cancellationToken);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(ex, "Stripe subscription downgrade scheduling failed for tenant {TenantId}", tenant.Id);
            throw new InvalidOperationException(
                "Could not schedule your plan change. Open Settings → Billing and try again.");
        }

        StripeSubscriptionDowngradeScheduler.ApplyScheduledDowngradeState(
            tenant,
            command.Plan,
            command.Interval,
            periodEnd,
            schedule.Id);

        Subscription refreshed;
        try
        {
            refreshed = await subscriptionService.GetAsync(
                tenant.StripeSubscriptionId!,
                cancellationToken: cancellationToken);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(
                ex,
                "Could not refresh Stripe subscription {SubscriptionId} after scheduling downgrade for tenant {TenantId}",
                tenant.StripeSubscriptionId,
                tenant.Id);
            refreshed = subscription;
        }

        StripeTenantBillingSync.ApplySubscription(tenant, refreshed, _settings);
        StripeSubscriptionDowngradeScheduler.ApplyScheduledDowngradeState(
            tenant,
            command.Plan,
            command.Interval,
            periodEnd,
            schedule.Id);
        await dbContext.SaveChangesAsync(cancellationToken);

        var effectiveAt = tenant.ScheduledPlanEffectiveAt ?? periodEnd;
        var currentPlanName = tenant.Plan.ToString();
        var targetPlanName = command.Plan.ToString();
        var tierDowngrade = StripeTenantBillingSync.IsPaidPlanDowngrade(tenant.Plan, command.Plan);
        var intervalDowngrade = StripeTenantBillingSync.IsBillingIntervalDowngrade(
            tenant.BillingInterval,
            command.Interval);
        var intervalOnlyChange = tenant.Plan == command.Plan && intervalDowngrade;
        var disclaimer = intervalOnlyChange
            ? $"Your billing interval will change to monthly on {effectiveAt:MMMM d, yyyy}. "
              + $"You keep {currentPlanName} access on yearly billing until then."
            : tierDowngrade && intervalDowngrade
                ? $"Your plan will change to {targetPlanName} on monthly billing on {effectiveAt:MMMM d, yyyy}. "
                  + $"You keep {currentPlanName} access until then."
                : tierDowngrade
                    ? $"Your plan will change to {targetPlanName} on {effectiveAt:MMMM d, yyyy}. "
                      + $"You keep {currentPlanName} access until then."
                    : $"Your plan will change to {targetPlanName} on {effectiveAt:MMMM d, yyyy}. "
                      + $"You keep {currentPlanName} access until then.";

        var usage = await tenantAccessService.GetUsageAsync(tenant.Id, cancellationToken);
        var warnings = tierDowngrade
            ? BillingDowngradeLimitWarnings.Build(usage, command.Plan)
            : Array.Empty<string>();
        BillingNotificationComposer.EnqueueScheduledDowngradeConfirmation(
            outboxPublisher,
            tenant,
            command.Plan,
            command.Interval,
            intervalOnlyChange,
            effectiveAt,
            warnings,
            publicWebOptions.Value,
            DateTimeOffset.UtcNow);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new CheckoutSessionDto(
            BuildInAppSuccessUrl(command.SuccessUrl, disclaimer),
            tenant.TrialEndsAt,
            tenant.BillingStatus == BillingStatus.Trialing,
            disclaimer,
            CompletedInApp: true,
            Warnings: warnings);
    }

    private async Task<CheckoutSessionDto> SubscribeWithSavedPaymentMethodAsync(
        Tenant tenant,
        CreateCheckoutSessionCommand command,
        string priceId,
        BillingPaymentMethodDto paymentMethod,
        CancellationToken cancellationToken)
    {
        var includeTrial = !tenant.HasConsumedTrial;
        DateTimeOffset? projectedTrialEnd = includeTrial
            ? DateTimeOffset.UtcNow.AddDays(_settings.TrialPeriodDays)
            : null;

        var subscriptionService = new SubscriptionService();
        var options = new SubscriptionCreateOptions
        {
            Customer = tenant.StripeCustomerId,
            DefaultPaymentMethod = paymentMethod.Id,
            Items =
            [
                new SubscriptionItemOptions
                {
                    Price = priceId,
                },
            ],
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
            options.TrialPeriodDays = _settings.TrialPeriodDays;
        }

        Subscription subscription;
        try
        {
            subscription = await subscriptionService.CreateAsync(options, cancellationToken: cancellationToken);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(
                ex,
                "Subscription create with saved payment method failed for tenant {TenantId}",
                tenant.Id);
            throw new InvalidOperationException(
                "Could not start your subscription with the saved payment method. Add a card in billing settings or continue to Stripe Checkout.");
        }

        if (subscription.Status is "incomplete" or "incomplete_expired")
        {
            throw new InvalidOperationException(
                "Your saved card requires additional verification. Remove it and add your card again, or continue to Stripe Checkout.");
        }

        StripeTenantBillingSync.ApplySubscription(tenant, subscription, _settings);
        await dbContext.SaveChangesAsync(cancellationToken);
        await EnsurePaidSitePageIfNeededAsync(tenant, cancellationToken);

        var disclaimer = projectedTrialEnd is null
            ? "Your subscription is active. Stripe will charge your saved payment method."
            : StripeTenantBillingSync.BuildTrialDisclaimer(projectedTrialEnd.Value);

        return new CheckoutSessionDto(
            BuildInAppSuccessUrl(command.SuccessUrl, disclaimer),
            tenant.TrialEndsAt ?? projectedTrialEnd,
            includeTrial,
            disclaimer,
            CompletedInApp: true);
    }

    private static string BuildInAppSuccessUrl(string successUrl, string? billingMessage = null)
    {
        if (string.IsNullOrWhiteSpace(successUrl))
        {
            return successUrl;
        }

        var withoutPlaceholder = successUrl.Replace(
            "{CHECKOUT_SESSION_ID}",
            string.Empty,
            StringComparison.Ordinal);

        var questionIndex = withoutPlaceholder.IndexOf('?', StringComparison.Ordinal);
        if (questionIndex < 0)
        {
            return withoutPlaceholder;
        }

        var baseUrl = withoutPlaceholder[..questionIndex];
        var keptQuery = withoutPlaceholder[(questionIndex + 1)..]
            .Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Where(part =>
            {
                if (!part.StartsWith("session_id=", StringComparison.Ordinal))
                {
                    return true;
                }

                var value = part["session_id=".Length..];
                return !string.IsNullOrWhiteSpace(value);
            });

        var rebuilt = string.Join("&", keptQuery);
        if (!string.IsNullOrWhiteSpace(billingMessage))
        {
            rebuilt = rebuilt.Length == 0
                ? $"billing_message={Uri.EscapeDataString(billingMessage)}"
                : $"{rebuilt}&billing_message={Uri.EscapeDataString(billingMessage)}";
        }

        return rebuilt.Length == 0 ? baseUrl : $"{baseUrl}?{rebuilt}";
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
            .FirstOrDefaultAsync(t => t.Id == command.TenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        if (tenant.IsComplimentary)
        {
            throw new InvalidOperationException("Complimentary tenants do not use Stripe Portal.");
        }

        var billingEmail = tenant.AdminContactEmail
            ?? throw new InvalidOperationException("Workspace billing owner email is not configured.");

        await EnsureStripeCustomerForOperatorAsync(tenant, billingEmail, cancellationToken);

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
        string? checkoutSessionId = null,
        CancellationToken cancellationToken = default)
    {
        if (!_settings.IsConfigured)
        {
            return await GetSummaryAsync(tenantId, cancellationToken);
        }

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        StripeConfiguration.ApiKey = _settings.SecretKey;
        var subscriptionService = new SubscriptionService();
        Subscription? subscription = null;

        if (!string.IsNullOrWhiteSpace(checkoutSessionId))
        {
            subscription = await TryResolveSubscriptionFromCheckoutSessionAsync(
                tenant,
                checkoutSessionId,
                subscriptionService,
                cancellationToken);
        }

        subscription ??= await TryResolveSubscriptionFromTenantAsync(
            tenant,
            subscriptionService,
            cancellationToken);

        if (subscription is not null)
        {
            StripeTenantBillingSync.ApplySubscription(tenant, subscription, _settings);
            await dbContext.SaveChangesAsync(cancellationToken);
            await EnsurePaidSitePageIfNeededAsync(tenant, cancellationToken);
        }
        else if (ClearUnverifiedPaidPlan(tenant))
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return await GetSummaryAsync(tenantId, cancellationToken);
    }

    public async Task ValidateBillingAccessAsync(
        Guid tenantId,
        string? operatorEmail,
        CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        if (TenantBillingAccess.CanManageBilling(tenant, operatorEmail, isTenantAdmin: true))
        {
            return;
        }

        var owner = string.IsNullOrWhiteSpace(tenant.AdminContactEmail)
            ? "the workspace owner"
            : tenant.AdminContactEmail.Trim();

        throw new UnauthorizedAccessException(
            TenantBillingAccess.RequiresBillingOwner(tenant.Plan)
                ? $"Billing is managed by {owner}."
                : "You do not have permission to manage billing for this workspace.");
    }

    public async Task<BillingDetailsDto> GetDetailsAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default)
    {
        await ValidateBillingAccessAsync(tenantId, operatorEmail, cancellationToken);

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        var summary = await GetSummaryAsync(tenantId, cancellationToken);

        if (tenant.IsComplimentary || !_settings.IsConfigured)
        {
            return new BillingDetailsDto(
                summary,
                BuildLocalContact(tenant),
                null,
                BuildLocalSubscription(tenant),
                []);
        }

        var tracked = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        await EnsureStripeCustomerForOperatorAsync(tracked, operatorEmail, cancellationToken);

        StripeConfiguration.ApiKey = _settings.SecretKey;

        var contact = await FetchStripeContactAsync(tracked.StripeCustomerId!, cancellationToken)
            ?? BuildLocalContact(tracked);
        var paymentMethod = await FetchDefaultPaymentMethodAsync(tracked.StripeCustomerId!, cancellationToken);
        var subscription = await FetchSubscriptionDetailsAsync(tracked, cancellationToken)
            ?? BuildLocalSubscription(tracked);
        var invoices = await FetchInvoicesAsync(tracked.StripeCustomerId!, cancellationToken);

        return new BillingDetailsDto(summary, contact, paymentMethod, subscription, invoices);
    }

    public async Task<SetupIntentDto> CreateSetupIntentAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default)
    {
        await ValidateBillingAccessAsync(tenantId, operatorEmail, cancellationToken);

        if (!_settings.IsConfigured)
        {
            throw new InvalidOperationException("Stripe is not configured.");
        }

        if (string.IsNullOrWhiteSpace(_settings.PublishableKey))
        {
            throw new InvalidOperationException("Stripe publishable key is not configured.");
        }

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        if (tenant.IsComplimentary)
        {
            throw new InvalidOperationException("Complimentary tenants do not manage payment methods.");
        }

        await EnsureStripeCustomerForOperatorAsync(tenant, operatorEmail, cancellationToken);

        StripeConfiguration.ApiKey = _settings.SecretKey;
        var setupIntentService = new SetupIntentService();

        SetupIntent setupIntent;
        try
        {
            setupIntent = await setupIntentService.CreateAsync(
                new SetupIntentCreateOptions
                {
                    Customer = tenant.StripeCustomerId,
                    PaymentMethodTypes = ["card"],
                    Usage = "off_session",
                },
                cancellationToken: cancellationToken);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(ex, "SetupIntent creation failed for tenant {TenantId}", tenant.Id);
            throw new InvalidOperationException("Could not start payment method setup.");
        }

        if (string.IsNullOrWhiteSpace(setupIntent.ClientSecret))
        {
            throw new InvalidOperationException("Stripe did not return a setup client secret.");
        }

        return new SetupIntentDto(setupIntent.ClientSecret, _settings.PublishableKey);
    }

    public async Task ConfirmSetupIntentAsync(
        Guid tenantId,
        string operatorEmail,
        string setupIntentId,
        CancellationToken cancellationToken = default)
    {
        await ValidateBillingAccessAsync(tenantId, operatorEmail, cancellationToken);

        if (!_settings.IsConfigured)
        {
            throw new InvalidOperationException("Stripe is not configured.");
        }

        if (string.IsNullOrWhiteSpace(setupIntentId))
        {
            throw new InvalidOperationException("Setup intent id is required.");
        }

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        if (tenant.IsComplimentary)
        {
            throw new InvalidOperationException("Complimentary tenants do not manage payment methods.");
        }

        await EnsureStripeCustomerForOperatorAsync(tenant, operatorEmail, cancellationToken);

        StripeConfiguration.ApiKey = _settings.SecretKey;
        var setupIntentService = new SetupIntentService();
        SetupIntent setupIntent;
        try
        {
            setupIntent = await setupIntentService.GetAsync(setupIntentId, cancellationToken: cancellationToken);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(ex, "SetupIntent fetch failed for tenant {TenantId}", tenant.Id);
            throw new InvalidOperationException("Could not confirm payment method setup.");
        }

        if (!string.Equals(setupIntent.CustomerId, tenant.StripeCustomerId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Setup intent does not belong to this workspace.");
        }

        if (setupIntent.Status is not ("succeeded" or "processing"))
        {
            throw new InvalidOperationException("Payment method setup is not complete yet.");
        }

        if (string.IsNullOrWhiteSpace(setupIntent.PaymentMethodId))
        {
            throw new InvalidOperationException("Setup intent did not return a payment method.");
        }

        var customerService = new CustomerService();
        try
        {
            await customerService.UpdateAsync(
                tenant.StripeCustomerId,
                new CustomerUpdateOptions
                {
                    InvoiceSettings = new CustomerInvoiceSettingsOptions
                    {
                        DefaultPaymentMethod = setupIntent.PaymentMethodId,
                    },
                },
                cancellationToken: cancellationToken);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(ex, "Default payment method update failed for tenant {TenantId}", tenant.Id);
            throw new InvalidOperationException("Could not save payment method as default.");
        }
    }

    public async Task UpdateBillingContactAsync(
        Guid tenantId,
        string operatorEmail,
        string? name,
        string? email,
        string? phoneCountry,
        string? phoneLocal,
        CancellationToken cancellationToken = default)
    {
        await ValidateBillingAccessAsync(tenantId, operatorEmail, cancellationToken);

        if (!_settings.IsConfigured)
        {
            throw new InvalidOperationException("Stripe is not configured.");
        }

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        if (tenant.IsComplimentary)
        {
            throw new InvalidOperationException("Complimentary tenants do not manage billing contact.");
        }

        await EnsureStripeCustomerForOperatorAsync(tenant, operatorEmail, cancellationToken);

        var options = new CustomerUpdateOptions();
        if (!string.IsNullOrWhiteSpace(name))
        {
            options.Name = name.Trim();
        }

        options.Email = operatorEmail.Trim();

        var hasPhoneUpdate = phoneCountry is not null || phoneLocal is not null;
        if (hasPhoneUpdate)
        {
            var localDigits = string.IsNullOrWhiteSpace(phoneLocal) ? string.Empty : phoneLocal.Trim();
            if (localDigits.Length == 0)
            {
                options.Phone = string.Empty;
            }
            else
            {
                var country = PhoneCountrySupport.ResolveIsoCountryCode(phoneCountry);
                if (!PhoneCountrySupport.IsSupportedIsoCode(country))
                {
                    throw new InvalidOperationException("Select a supported mobile country.");
                }

                var validationError = PhoneCountrySupport.ValidateLocalMobileNumber(country, localDigits);
                if (validationError is not null)
                {
                    throw new InvalidOperationException(validationError);
                }

                var normalized = PhoneCountrySupport.NormalizePhone(localDigits, country);
                if (string.IsNullOrWhiteSpace(normalized))
                {
                    throw new InvalidOperationException("Enter a valid mobile number.");
                }

                options.Phone = normalized;
            }
        }

        if (options.Name is null && !hasPhoneUpdate)
        {
            throw new InvalidOperationException("Provide a name or mobile number to update.");
        }

        StripeConfiguration.ApiKey = _settings.SecretKey;
        var customerService = new CustomerService();
        try
        {
            await customerService.UpdateAsync(tenant.StripeCustomerId, options, cancellationToken: cancellationToken);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(ex, "Billing contact update failed for tenant {TenantId}", tenant.Id);
            throw new InvalidOperationException("Could not update billing contact.");
        }

        tenant.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task CancelSubscriptionAtPeriodEndAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default)
    {
        await UpdateSubscriptionCancelAtPeriodEndAsync(
            tenantId,
            operatorEmail,
            cancelAtPeriodEnd: true,
            cancellationToken);
    }

    public async Task ResumeSubscriptionAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default)
    {
        await UpdateSubscriptionCancelAtPeriodEndAsync(
            tenantId,
            operatorEmail,
            cancelAtPeriodEnd: false,
            cancellationToken);
    }

    public async Task CancelScheduledPlanChangeAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default)
    {
        await ValidateBillingAccessAsync(tenantId, operatorEmail, cancellationToken);

        if (!_settings.IsConfigured)
        {
            throw new InvalidOperationException("Stripe is not configured.");
        }

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        if (tenant.IsComplimentary)
        {
            throw new InvalidOperationException("Complimentary tenants do not manage subscriptions.");
        }

        if (tenant.ScheduledPlan is null or TenantPlan.Basic)
        {
            throw new InvalidOperationException("No scheduled plan change to cancel.");
        }

        if (tenant.Plan is not (TenantPlan.Core or TenantPlan.Pro))
        {
            throw new InvalidOperationException("This workspace has no paid plan to restore.");
        }

        if (string.IsNullOrWhiteSpace(tenant.StripeSubscriptionId))
        {
            throw new InvalidOperationException("This workspace has no active Stripe subscription.");
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
                "Could not load Stripe subscription {SubscriptionId} for tenant {TenantId}",
                tenant.StripeSubscriptionId,
                tenant.Id);
            throw new InvalidOperationException(
                "Could not load your current subscription. Open Settings → Billing and try again.");
        }

        var currentItem = subscription.Items?.Data?.FirstOrDefault()
            ?? throw new InvalidOperationException("Stripe subscription has no billable items.");

        BillingInterval restoreInterval;
        if (StripeSubscriptionDowngradeScheduler.HasActiveScheduledPaidDowngrade(tenant)
            && tenant.BillingInterval is { } scheduledCurrentInterval)
        {
            restoreInterval = scheduledCurrentInterval;
        }
        else if (!string.IsNullOrWhiteSpace(currentItem.Price?.Id)
            && StripeTenantBillingSync.TryMapPrice(
                currentItem.Price.Id,
                _settings,
                out var mappedPlan,
                out restoreInterval)
            && mappedPlan == tenant.Plan)
        {
            // Keep the live Stripe subscription interval when it still matches the current plan.
        }
        else
        {
            restoreInterval = tenant.BillingInterval ?? BillingInterval.Monthly;
        }

        var restorePriceId = StripeTenantBillingSync.ResolvePriceId(tenant.Plan, restoreInterval, _settings)
            ?? throw new InvalidOperationException("Stripe price ID is not configured for your current plan.");

        var scheduleId = tenant.StripeSubscriptionScheduleId ?? subscription.ScheduleId;
        if (!string.IsNullOrWhiteSpace(scheduleId))
        {
            try
            {
                await StripeSubscriptionDowngradeScheduler.ReleaseScheduleAsync(
                    scheduleId,
                    cancellationToken);
            }
            catch (StripeException ex)
            {
                logger.LogWarning(
                    ex,
                    "Stripe subscription schedule release failed for tenant {TenantId}",
                    tenant.Id);
                throw new InvalidOperationException(
                    "Could not cancel the scheduled plan change. Open Settings → Billing and try again.");
            }
        }
        else if (!string.Equals(currentItem.Price?.Id, restorePriceId, StringComparison.Ordinal))
        {
            try
            {
                var updated = await subscriptionService.UpdateAsync(
                    subscription.Id,
                    new SubscriptionUpdateOptions
                    {
                        Items =
                        [
                            new SubscriptionItemOptions
                            {
                                Id = currentItem.Id,
                                Price = restorePriceId,
                            },
                        ],
                        Metadata = new Dictionary<string, string>
                        {
                            ["tenant_id"] = tenant.Id.ToString(),
                            ["plan"] = tenant.Plan.ToString(),
                            ["interval"] = restoreInterval.ToString(),
                        },
                        ProrationBehavior = "none",
                    },
                    cancellationToken: cancellationToken);

                StripeTenantBillingSync.ApplySubscription(tenant, updated, _settings);
                StripeSubscriptionDowngradeScheduler.ClearScheduledDowngradeState(tenant);
                await dbContext.SaveChangesAsync(cancellationToken);
                return;
            }
            catch (StripeException ex)
            {
                logger.LogWarning(
                    ex,
                    "Stripe subscription restore failed for tenant {TenantId}",
                    tenant.Id);
                throw new InvalidOperationException(
                    "Could not cancel the scheduled plan change. Open Settings → Billing and try again.");
            }
        }

        StripeSubscriptionDowngradeScheduler.ClearScheduledDowngradeState(tenant);

        Subscription refreshed;
        try
        {
            refreshed = await subscriptionService.GetAsync(
                tenant.StripeSubscriptionId,
                cancellationToken: cancellationToken);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(
                ex,
                "Could not refresh Stripe subscription {SubscriptionId} after canceling schedule for tenant {TenantId}",
                tenant.StripeSubscriptionId,
                tenant.Id);
            await dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        StripeTenantBillingSync.ApplySubscription(tenant, refreshed, _settings);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task UpdateSubscriptionCancelAtPeriodEndAsync(
        Guid tenantId,
        string operatorEmail,
        bool cancelAtPeriodEnd,
        CancellationToken cancellationToken)
    {
        await ValidateBillingAccessAsync(tenantId, operatorEmail, cancellationToken);

        if (!_settings.IsConfigured)
        {
            throw new InvalidOperationException("Stripe is not configured.");
        }

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        if (tenant.IsComplimentary)
        {
            throw new InvalidOperationException("Complimentary tenants do not manage subscriptions.");
        }

        if (string.IsNullOrWhiteSpace(tenant.StripeSubscriptionId))
        {
            throw new InvalidOperationException("This workspace has no active Stripe subscription.");
        }

        StripeConfiguration.ApiKey = _settings.SecretKey;
        var subscriptionService = new SubscriptionService();
        Subscription updated;
        try
        {
            updated = await subscriptionService.UpdateAsync(
                tenant.StripeSubscriptionId,
                new SubscriptionUpdateOptions { CancelAtPeriodEnd = cancelAtPeriodEnd },
                cancellationToken: cancellationToken);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(
                ex,
                "Subscription cancel-at-period-end update failed for tenant {TenantId}",
                tenant.Id);
            throw new InvalidOperationException("Could not update subscription cancellation.");
        }

        StripeTenantBillingSync.ApplySubscription(tenant, updated, _settings);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static BillingContactDto BuildLocalContact(Tenant tenant) =>
        new(tenant.Name, tenant.AdminContactEmail ?? string.Empty, null);

    private static BillingSubscriptionDetailsDto? BuildLocalSubscription(Tenant tenant)
    {
        if (tenant.Plan is TenantPlan.Basic)
        {
            return null;
        }

        return new BillingSubscriptionDetailsDto(
            tenant.ScheduledPlan == TenantPlan.Basic && tenant.ScheduledPlanEffectiveAt is not null,
            tenant.ScheduledPlanEffectiveAt,
            tenant.ScheduledPlan?.ToString(),
            tenant.ScheduledPlanEffectiveAt);
    }

    private async Task<BillingContactDto?> FetchStripeContactAsync(
        string customerId,
        CancellationToken cancellationToken)
    {
        var customerService = new CustomerService();
        try
        {
            var customer = await customerService.GetAsync(customerId, cancellationToken: cancellationToken);
            return new BillingContactDto(
                customer.Name ?? string.Empty,
                customer.Email ?? string.Empty,
                string.IsNullOrWhiteSpace(customer.Phone) ? null : customer.Phone);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(ex, "Could not fetch Stripe customer {CustomerId}", customerId);
            return null;
        }
    }

    private async Task<BillingPaymentMethodDto?> FetchDefaultPaymentMethodAsync(
        string customerId,
        CancellationToken cancellationToken)
    {
        var customerService = new CustomerService();
        Customer customer;
        try
        {
            customer = await customerService.GetAsync(
                customerId,
                new CustomerGetOptions
                {
                    Expand = ["invoice_settings.default_payment_method"],
                },
                cancellationToken: cancellationToken);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(ex, "Could not fetch Stripe customer {CustomerId}", customerId);
            return null;
        }

        if (customer.InvoiceSettings?.DefaultPaymentMethod is PaymentMethod paymentMethod)
        {
            return MapPaymentMethod(paymentMethod);
        }

        if (customer.InvoiceSettings?.DefaultPaymentMethodId is string paymentMethodId)
        {
            var paymentMethodService = new PaymentMethodService();
            try
            {
                var fetched = await paymentMethodService.GetAsync(
                    paymentMethodId,
                    cancellationToken: cancellationToken);
                return MapPaymentMethod(fetched);
            }
            catch (StripeException ex)
            {
                logger.LogWarning(ex, "Could not fetch payment method {PaymentMethodId}", paymentMethodId);
            }
        }

        var paymentMethods = await new PaymentMethodService().ListAsync(
            new PaymentMethodListOptions
            {
                Customer = customerId,
                Type = "card",
                Limit = 1,
            },
            cancellationToken: cancellationToken);

        return paymentMethods.Data.FirstOrDefault() is { } fallback
            ? MapPaymentMethod(fallback)
            : null;
    }

    private static BillingPaymentMethodDto MapPaymentMethod(PaymentMethod paymentMethod)
    {
        var card = paymentMethod.Card
            ?? throw new InvalidOperationException("Payment method is not a card.");

        return new BillingPaymentMethodDto(
            paymentMethod.Id,
            card.Brand ?? "card",
            card.Last4 ?? "????",
            (int)card.ExpMonth,
            (int)card.ExpYear);
    }

    private async Task<BillingSubscriptionDetailsDto?> FetchSubscriptionDetailsAsync(
        Tenant tenant,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(tenant.StripeSubscriptionId))
        {
            return BuildLocalSubscription(tenant);
        }

        var subscriptionService = new SubscriptionService();
        try
        {
            var subscription = await subscriptionService.GetAsync(
                tenant.StripeSubscriptionId,
                cancellationToken: cancellationToken);
            var periodEnd = StripeTenantBillingSync.ResolvePeriodEnd(subscription);
            return new BillingSubscriptionDetailsDto(
                subscription.CancelAtPeriodEnd,
                periodEnd,
                tenant.ScheduledPlan?.ToString(),
                tenant.ScheduledPlanEffectiveAt);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(
                ex,
                "Could not fetch subscription {SubscriptionId} for tenant {TenantId}",
                tenant.StripeSubscriptionId,
                tenant.Id);
            return BuildLocalSubscription(tenant);
        }
    }

    private async Task<IReadOnlyList<BillingInvoiceDto>> FetchInvoicesAsync(
        string customerId,
        CancellationToken cancellationToken)
    {
        var invoiceService = new InvoiceService();
        try
        {
            var invoices = await invoiceService.ListAsync(
                new InvoiceListOptions
                {
                    Customer = customerId,
                    Limit = 24,
                },
                cancellationToken: cancellationToken);

            return invoices.Data
                .Select(invoice => new BillingInvoiceDto(
                    invoice.Id,
                    new DateTimeOffset(DateTime.SpecifyKind(invoice.Created, DateTimeKind.Utc)),
                    invoice.AmountDue,
                    invoice.Currency ?? "usd",
                    invoice.Status ?? "unknown",
                    invoice.InvoicePdf,
                    invoice.HostedInvoiceUrl))
                .ToList();
        }
        catch (StripeException ex)
        {
            logger.LogWarning(ex, "Could not list invoices for customer {CustomerId}", customerId);
            return [];
        }
    }

    /// <summary>
    /// Heals Plan=Pro/Core + Billing=Free with no live Stripe subscription
    /// (e.g. abandoned Checkout that previously granted a plan from metadata).
    /// Complimentary/sponsored tenants are left unchanged.
    /// </summary>
    private static bool ClearUnverifiedPaidPlan(Tenant tenant)
    {
        if (tenant.IsComplimentary || LoadTestTenantRules.IsLoadTestSlug(tenant.Slug))
        {
            return false;
        }

        if (tenant.Plan is not (TenantPlan.Core or TenantPlan.Pro))
        {
            return false;
        }

        if (tenant.BillingStatus is not (BillingStatus.Free or BillingStatus.Canceled))
        {
            return false;
        }

        // If we still have a subscription id, a fetch failure should not wipe the plan.
        if (!string.IsNullOrWhiteSpace(tenant.StripeSubscriptionId))
        {
            return false;
        }

        tenant.Plan = TenantPlan.Basic;
        tenant.BillingStatus = BillingStatus.Free;
        tenant.BillingInterval = null;
        tenant.TrialEndsAt = null;
        tenant.ScheduledPlan = null;
        tenant.ScheduledPlanEffectiveAt = null;
        tenant.ScheduledBillingInterval = null;
        tenant.StripeSubscriptionScheduleId = null;
        tenant.UpdatedAt = DateTimeOffset.UtcNow;
        return true;
    }

    private async Task<Subscription?> TryResolveSubscriptionFromCheckoutSessionAsync(
        Tenant tenant,
        string checkoutSessionId,
        SubscriptionService subscriptionService,
        CancellationToken cancellationToken)
    {
        try
        {
            var sessionService = new SessionService();
            var session = await sessionService.GetAsync(checkoutSessionId, cancellationToken: cancellationToken);

            if (session.Metadata is not null
                && session.Metadata.TryGetValue("tenant_id", out var tenantIdRaw)
                && Guid.TryParse(tenantIdRaw, out var metadataTenantId)
                && metadataTenantId != tenant.Id)
            {
                logger.LogWarning(
                    "Checkout session {SessionId} tenant mismatch for tenant {TenantId}",
                    checkoutSessionId,
                    tenant.Id);
                return null;
            }

            StripeTenantBillingSync.ApplyCheckoutSession(tenant, session, _settings);

            if (string.IsNullOrWhiteSpace(session.SubscriptionId))
            {
                // Link Stripe customer ids only. Plan unlocks when a real
                // trialing/active subscription is applied below or via webhook.
                await dbContext.SaveChangesAsync(cancellationToken);
                return null;
            }

            var subscription = await subscriptionService.GetAsync(
                session.SubscriptionId,
                cancellationToken: cancellationToken);
            return subscription;
        }
        catch (StripeException ex)
        {
            logger.LogWarning(
                ex,
                "Could not resolve checkout session {SessionId} for tenant {TenantId}",
                checkoutSessionId,
                tenant.Id);
            return null;
        }
    }

    private async Task<Subscription?> TryResolveSubscriptionFromTenantAsync(
        Tenant tenant,
        SubscriptionService subscriptionService,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(tenant.StripeSubscriptionId))
        {
            try
            {
                return await subscriptionService.GetAsync(
                    tenant.StripeSubscriptionId,
                    cancellationToken: cancellationToken);
            }
            catch (StripeException ex)
            {
                logger.LogWarning(
                    ex,
                    "Could not fetch Stripe subscription {SubscriptionId} for tenant {TenantId}",
                    tenant.StripeSubscriptionId,
                    tenant.Id);
            }
        }

        if (string.IsNullOrWhiteSpace(tenant.StripeCustomerId))
        {
            return null;
        }

        try
        {
            var subscriptions = await subscriptionService.ListAsync(
                new SubscriptionListOptions
                {
                    Customer = tenant.StripeCustomerId,
                    Limit = 10,
                },
                cancellationToken: cancellationToken);

            return subscriptions.Data
                .Where(s => s.Status is "trialing" or "active" or "past_due")
                .OrderByDescending(s => s.Created)
                .FirstOrDefault();
        }
        catch (StripeException ex)
        {
            logger.LogWarning(
                ex,
                "Could not list Stripe subscriptions for customer {CustomerId} tenant {TenantId}",
                tenant.StripeCustomerId,
                tenant.Id);
            return null;
        }
    }

    private async Task EnsureStripeCustomerForOperatorAsync(
        Tenant tenant,
        string operatorEmail,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(operatorEmail))
        {
            throw new InvalidOperationException("Signed-in operator email is required.");
        }

        var normalizedEmail = operatorEmail.Trim();
        StripeConfiguration.ApiKey = _settings.SecretKey;
        var customerService = new CustomerService();

        if (string.IsNullOrWhiteSpace(tenant.StripeCustomerId))
        {
            Customer customer;
            try
            {
                customer = await customerService.CreateAsync(
                    new CustomerCreateOptions
                    {
                        Email = normalizedEmail,
                        Name = tenant.Name,
                        Metadata = new Dictionary<string, string>
                        {
                            ["tenant_id"] = tenant.Id.ToString(),
                            ["tenant_slug"] = tenant.Slug,
                        },
                    },
                    cancellationToken: cancellationToken);
            }
            catch (StripeException ex)
            {
                logger.LogWarning(ex, "Stripe customer creation failed for tenant {TenantId}", tenant.Id);
                throw new InvalidOperationException("Could not create Stripe customer for this workspace.");
            }

            if (string.IsNullOrWhiteSpace(customer.Id))
            {
                throw new InvalidOperationException("Stripe did not return a customer id.");
            }

            tenant.StripeCustomerId = customer.Id;
            tenant.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        try
        {
            var existing = await customerService.GetAsync(
                tenant.StripeCustomerId,
                cancellationToken: cancellationToken);
            if (string.Equals(existing.Email, normalizedEmail, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            await customerService.UpdateAsync(
                tenant.StripeCustomerId,
                new CustomerUpdateOptions
                {
                    Email = normalizedEmail,
                    Name = string.IsNullOrWhiteSpace(existing.Name) ? tenant.Name : existing.Name,
                },
                cancellationToken: cancellationToken);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(
                ex,
                "Stripe customer email sync failed for tenant {TenantId}",
                tenant.Id);
            throw new InvalidOperationException("Could not sync billing email for this workspace.");
        }
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
