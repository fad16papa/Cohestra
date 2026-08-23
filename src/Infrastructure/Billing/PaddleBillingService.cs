using Cohestra.Application.Billing;
using Cohestra.Application.Outbox;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Registrations;
using Cohestra.Infrastructure.Seed;
using Cohestra.Infrastructure.Site;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Billing;

internal sealed class PaddleBillingService(
    CohestraDbContext dbContext,
    IOptions<PaddleSettings> paddleOptions,
    ITenantAccessService tenantAccessService,
    IPaddleApiClient paddleClient,
    IPublishedSiteCache publishedSiteCache,
    IOptions<SiteLandingSeedSettings> landingSeedSettings,
    IOutboxPublisher outboxPublisher,
    IOptions<PublicWebOptions> publicWebOptions,
    ILogger<PaddleBillingService> logger) : IBillingService
{
    private readonly PaddleSettings _settings = paddleOptions.Value;

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
            string.IsNullOrWhiteSpace(_settings.ClientToken) ? null : _settings.ClientToken,
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

    public async Task<CheckoutSessionDto> CreateCheckoutSessionAsync(
        CreateCheckoutSessionCommand command,
        CancellationToken cancellationToken = default)
    {
        EnsureConfigured();

        if (command.Plan is not (TenantPlan.Core or TenantPlan.Pro))
        {
            throw new InvalidOperationException("Checkout is only available for Core or Pro plans.");
        }

        var priceId = TenantBillingPlanSync.ResolvePriceId(command.Plan, command.Interval, _settings)
            ?? throw new InvalidOperationException("Paddle price ID is not configured for the selected plan.");

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == command.TenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        if (tenant.IsComplimentary)
        {
            throw new InvalidOperationException("Complimentary tenants do not use Checkout.");
        }

        if (CanUpgradeExistingSubscription(tenant))
        {
            return await UpgradeExistingSubscriptionAsync(tenant, command, cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(tenant.PaddleSubscriptionId))
        {
            throw new InvalidOperationException("Tenant already has a subscription in progress.");
        }

        await EnsurePaddleCustomerForOperatorAsync(tenant, command.AdminEmail, cancellationToken);

        var savedPaymentMethod = await FetchDefaultPaymentMethodAsync(
            tenant.PaddleCustomerId!,
            cancellationToken);
        if (savedPaymentMethod is not null)
        {
            return await SubscribeWithSavedPaymentMethodAsync(
                tenant,
                command,
                priceId,
                cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(tenant.PaddleCustomerId)
            && string.IsNullOrWhiteSpace(command.AdminEmail))
        {
            throw new InvalidOperationException("Admin email is required to start Checkout.");
        }

        var includeTrial = !tenant.HasConsumedTrial;
        DateTimeOffset? projectedTrialEnd = includeTrial
            ? DateTimeOffset.UtcNow.AddDays(_settings.TrialPeriodDays)
            : null;

        PaddleTransaction transaction;
        try
        {
            transaction = await paddleClient.CreateCheckoutTransactionAsync(
                priceId,
                tenant.PaddleCustomerId!,
                BuildCustomData(tenant, command),
                cancellationToken);
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(ex, "Paddle checkout transaction failed for tenant {TenantId}", tenant.Id);
            throw new InvalidOperationException("Could not create checkout session.");
        }

        if (string.IsNullOrWhiteSpace(transaction.Checkout?.Url))
        {
            throw new InvalidOperationException("Checkout did not return a URL.");
        }

        var disclaimer = projectedTrialEnd is null
            ? "Your card will be charged immediately when you subscribe."
            : TenantBillingPlanSync.BuildTrialDisclaimer(projectedTrialEnd.Value);

        return new CheckoutSessionDto(
            transaction.Checkout.Url,
            projectedTrialEnd,
            includeTrial,
            disclaimer);
    }

    public async Task<PortalSessionDto> CreatePortalSessionAsync(
        CreatePortalSessionCommand command,
        CancellationToken cancellationToken = default)
    {
        EnsureConfigured();

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == command.TenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        if (tenant.IsComplimentary)
        {
            throw new InvalidOperationException("Complimentary tenants do not use the billing portal.");
        }

        var billingEmail = tenant.AdminContactEmail
            ?? throw new InvalidOperationException("Workspace billing owner email is not configured.");

        await EnsurePaddleCustomerForOperatorAsync(tenant, billingEmail, cancellationToken);

        try
        {
            var session = await paddleClient.CreatePortalSessionAsync(
                tenant.PaddleCustomerId!,
                tenant.PaddleSubscriptionId,
                cancellationToken);
            var url = session.Urls?.General?.Resolved ?? session.Urls?.Overview?.Resolved;
            if (string.IsNullOrWhiteSpace(url))
            {
                throw new InvalidOperationException("Billing portal did not return a URL.");
            }

            return new PortalSessionDto(url);
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(ex, "Paddle portal session failed for tenant {TenantId}", tenant.Id);
            throw new InvalidOperationException("Could not open the billing portal.");
        }
    }

    public async Task<BillingSummaryDto> SyncFromProviderAsync(
        Guid tenantId,
        string? transactionId = null,
        CancellationToken cancellationToken = default)
    {
        if (!_settings.IsConfigured)
        {
            return await GetSummaryAsync(tenantId, cancellationToken);
        }

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        PaddleSubscription? subscription = null;
        if (!string.IsNullOrWhiteSpace(transactionId))
        {
            subscription = await TryResolveSubscriptionFromTransactionAsync(
                tenant,
                transactionId,
                cancellationToken);
        }

        subscription ??= await TryResolveSubscriptionFromTenantAsync(tenant, cancellationToken);

        if (subscription is not null)
        {
            await ApplyLiveSubscriptionAsync(tenant, subscription, cancellationToken);
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

        await EnsurePaddleCustomerForOperatorAsync(tracked, operatorEmail, cancellationToken);

        var contact = await FetchPaddleContactAsync(tracked.PaddleCustomerId!, cancellationToken)
            ?? BuildLocalContact(tracked);
        var paymentMethod = await FetchDefaultPaymentMethodAsync(tracked.PaddleCustomerId!, cancellationToken);
        var subscription = await FetchSubscriptionDetailsAsync(tracked, cancellationToken)
            ?? BuildLocalSubscription(tracked);
        var invoices = await FetchInvoicesAsync(tracked.PaddleCustomerId!, cancellationToken);

        return new BillingDetailsDto(summary, contact, paymentMethod, subscription, invoices);
    }

    public async Task<SetupIntentDto> CreateSetupIntentAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default)
    {
        await ValidateBillingAccessAsync(tenantId, operatorEmail, cancellationToken);
        EnsureConfigured();

        if (string.IsNullOrWhiteSpace(_settings.ClientToken))
        {
            throw new InvalidOperationException("Paddle client token is not configured.");
        }

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        if (tenant.IsComplimentary)
        {
            throw new InvalidOperationException("Complimentary tenants do not manage payment methods.");
        }

        await EnsurePaddleCustomerForOperatorAsync(tenant, operatorEmail, cancellationToken);

        if (string.IsNullOrWhiteSpace(tenant.PaddleSubscriptionId))
        {
            throw new InvalidOperationException(
                "Add your card when you subscribe. Open checkout to start Core or Pro.");
        }

        try
        {
            var transaction = await paddleClient.CreateUpdatePaymentMethodTransactionAsync(
                tenant.PaddleSubscriptionId,
                cancellationToken);
            if (string.IsNullOrWhiteSpace(transaction.Id))
            {
                throw new InvalidOperationException("Could not start payment method setup.");
            }

            return new SetupIntentDto(transaction.Id, _settings.ClientToken);
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(ex, "Paddle payment method setup failed for tenant {TenantId}", tenant.Id);
            throw new InvalidOperationException("Could not start payment method setup.");
        }
    }

    public async Task ConfirmSetupIntentAsync(
        Guid tenantId,
        string operatorEmail,
        string setupIntentId,
        CancellationToken cancellationToken = default)
    {
        await ValidateBillingAccessAsync(tenantId, operatorEmail, cancellationToken);
        EnsureConfigured();

        if (string.IsNullOrWhiteSpace(setupIntentId))
        {
            throw new InvalidOperationException("Payment method setup id is required.");
        }

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        if (tenant.IsComplimentary)
        {
            throw new InvalidOperationException("Complimentary tenants do not manage payment methods.");
        }

        PaddleTransaction? transaction;
        try
        {
            transaction = await paddleClient.GetTransactionAsync(setupIntentId, cancellationToken);
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(ex, "Paddle payment method confirm failed for tenant {TenantId}", tenant.Id);
            throw new InvalidOperationException("Could not confirm payment method setup.");
        }

        if (transaction is null)
        {
            throw new InvalidOperationException("Payment method setup is not complete yet.");
        }

        if (!string.IsNullOrWhiteSpace(transaction.CustomerId)
            && !string.Equals(transaction.CustomerId, tenant.PaddleCustomerId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Payment method setup does not belong to this workspace.");
        }

        if (transaction.Status is not ("completed" or "paid" or "billed" or "ready"))
        {
            throw new InvalidOperationException("Payment method setup is not complete yet.");
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
        EnsureConfigured();

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        if (tenant.IsComplimentary)
        {
            throw new InvalidOperationException("Complimentary tenants do not manage billing contact.");
        }

        await EnsurePaddleCustomerForOperatorAsync(tenant, operatorEmail, cancellationToken);

        var hasPhoneUpdate = phoneCountry is not null || phoneLocal is not null;
        if (hasPhoneUpdate)
        {
            var localDigits = string.IsNullOrWhiteSpace(phoneLocal) ? string.Empty : phoneLocal.Trim();
            if (localDigits.Length > 0)
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

                if (string.IsNullOrWhiteSpace(PhoneCountrySupport.NormalizePhone(localDigits, country)))
                {
                    throw new InvalidOperationException("Enter a valid mobile number.");
                }
            }
        }

        if (string.IsNullOrWhiteSpace(name) && !hasPhoneUpdate)
        {
            throw new InvalidOperationException("Provide a name or mobile number to update.");
        }

        try
        {
            await paddleClient.UpdateCustomerAsync(
                tenant.PaddleCustomerId!,
                operatorEmail.Trim(),
                string.IsNullOrWhiteSpace(name) ? null : name.Trim(),
                cancellationToken);
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(ex, "Billing contact update failed for tenant {TenantId}", tenant.Id);
            throw new InvalidOperationException("Could not update billing contact.");
        }

        tenant.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task CancelSubscriptionAtPeriodEndAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default) =>
        UpdateSubscriptionCancelAtPeriodEndAsync(tenantId, operatorEmail, cancelAtPeriodEnd: true, cancellationToken);

    public Task ResumeSubscriptionAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default) =>
        UpdateSubscriptionCancelAtPeriodEndAsync(tenantId, operatorEmail, cancelAtPeriodEnd: false, cancellationToken);

    public async Task CancelScheduledPlanChangeAsync(
        Guid tenantId,
        string operatorEmail,
        CancellationToken cancellationToken = default)
    {
        await ValidateBillingAccessAsync(tenantId, operatorEmail, cancellationToken);
        EnsureConfigured();

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

        if (string.IsNullOrWhiteSpace(tenant.PaddleSubscriptionId))
        {
            throw new InvalidOperationException("This workspace has no active subscription.");
        }

        var restoreInterval = tenant.BillingInterval ?? BillingInterval.Monthly;
        var restorePriceId = TenantBillingPlanSync.ResolvePriceId(tenant.Plan, restoreInterval, _settings)
            ?? throw new InvalidOperationException("Paddle price ID is not configured for your current plan.");

        try
        {
            var updated = await paddleClient.UpdateSubscriptionItemsAsync(
                tenant.PaddleSubscriptionId,
                restorePriceId,
                "immediately",
                "do_not_bill",
                new Dictionary<string, string>
                {
                    ["tenant_id"] = tenant.Id.ToString(),
                    ["plan"] = tenant.Plan.ToString(),
                    ["interval"] = restoreInterval.ToString(),
                },
                cancellationToken);
            PaddleSubscriptionChangeScheduler.ClearScheduledDowngradeState(tenant);
            PaddleTenantBillingSync.ApplySubscription(tenant, updated, _settings);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(ex, "Paddle scheduled change cancel failed for tenant {TenantId}", tenant.Id);
            throw new InvalidOperationException(
                "Could not cancel the scheduled plan change. Open Settings → Billing and try again.");
        }
    }

    private async Task<CheckoutSessionDto> UpgradeExistingSubscriptionAsync(
        Tenant tenant,
        CreateCheckoutSessionCommand command,
        CancellationToken cancellationToken)
    {
        if (TenantBillingPlanSync.ShouldDeferPlanChange(
                tenant.Plan,
                tenant.BillingInterval,
                command.Plan,
                command.Interval))
        {
            return await ScheduleDowngradeExistingSubscriptionAsync(tenant, command, cancellationToken);
        }

        if (PaddleSubscriptionChangeScheduler.HasActiveScheduledPaidDowngrade(tenant))
        {
            throw new InvalidOperationException(
                "A plan change is already scheduled. Undo it on the checkout page or in Settings → Billing before choosing a different plan.");
        }

        var newPriceId = TenantBillingPlanSync.ResolvePriceId(command.Plan, command.Interval, _settings)
            ?? throw new InvalidOperationException("Paddle price ID is not configured for the selected plan.");

        PaddleSubscription subscription;
        try
        {
            subscription = await paddleClient.GetSubscriptionAsync(tenant.PaddleSubscriptionId!, cancellationToken)
                ?? throw new InvalidOperationException(
                    "Could not load your current subscription. Open Settings → Billing and try again.");
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(
                ex,
                "Could not load Paddle subscription {SubscriptionId} for tenant {TenantId}",
                tenant.PaddleSubscriptionId,
                tenant.Id);
            throw new InvalidOperationException(
                "Could not load your current subscription. Open Settings → Billing and try again.");
        }

        var currentPriceId = subscription.Items.FirstOrDefault()?.Price?.Id;
        if (string.Equals(currentPriceId, newPriceId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Your workspace is already on the selected plan and billing interval.");
        }

        PaddleSubscription updated;
        try
        {
            updated = await paddleClient.UpdateSubscriptionItemsAsync(
                subscription.Id,
                newPriceId,
                "immediately",
                "prorated_next_billing_period",
                BuildCustomData(tenant, command),
                cancellationToken);
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(ex, "Paddle subscription upgrade failed for tenant {TenantId}", tenant.Id);
            throw new InvalidOperationException(
                "Could not update your subscription. Open Settings → Billing and try again.");
        }

        await ApplyLiveSubscriptionAsync(tenant, updated, cancellationToken);

        var disclaimer = tenant.BillingStatus == BillingStatus.Trialing && tenant.TrialEndsAt is { } trialEnd
            ? TenantBillingPlanSync.BuildTrialDisclaimer(trialEnd)
            : "Your plan was updated. Any price difference is prorated on your next invoice.";

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
        if (PaddleSubscriptionChangeScheduler.HasActiveScheduledPaidDowngrade(tenant))
        {
            throw new InvalidOperationException(
                "A plan change is already scheduled. Undo it on the checkout page or in Settings → Billing before choosing a different plan.");
        }

        var newPriceId = TenantBillingPlanSync.ResolvePriceId(command.Plan, command.Interval, _settings)
            ?? throw new InvalidOperationException("Paddle price ID is not configured for the selected plan.");

        PaddleSubscription subscription;
        try
        {
            subscription = await paddleClient.GetSubscriptionAsync(tenant.PaddleSubscriptionId!, cancellationToken)
                ?? throw new InvalidOperationException(
                    "Could not load your current subscription. Open Settings → Billing and try again.");
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(
                ex,
                "Could not load Paddle subscription {SubscriptionId} for tenant {TenantId}",
                tenant.PaddleSubscriptionId,
                tenant.Id);
            throw new InvalidOperationException(
                "Could not load your current subscription. Open Settings → Billing and try again.");
        }

        var currentPriceId = subscription.Items.FirstOrDefault()?.Price?.Id
            ?? throw new InvalidOperationException("Subscription has no billable items.");

        if (string.Equals(currentPriceId, newPriceId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Your workspace is already on the selected plan and billing interval.");
        }

        if (PaddleSubscriptionChangeScheduler.SubscriptionHasCancelAtPeriodEnd(subscription))
        {
            try
            {
                subscription = await paddleClient.ClearScheduledChangeAsync(subscription.Id, cancellationToken);
            }
            catch (PaddleApiException ex)
            {
                logger.LogWarning(
                    ex,
                    "Could not clear cancel-at-period-end before scheduling downgrade for tenant {TenantId}",
                    tenant.Id);
                throw new InvalidOperationException(
                    "Could not schedule your plan change while cancellation is pending. Open Settings → Billing and try again.");
            }

            PaddleTenantBillingSync.ApplySubscription(tenant, subscription, _settings);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var periodEnd = PaddleTenantBillingSync.ResolvePeriodEnd(subscription)
            ?? throw new InvalidOperationException(
                "Could not determine when your current billing period ends. Open Settings → Billing and try again.");

        try
        {
            subscription = await paddleClient.UpdateSubscriptionItemsAsync(
                subscription.Id,
                newPriceId,
                "next_billing_period",
                "do_not_bill",
                BuildCustomData(tenant, command),
                cancellationToken);
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(ex, "Paddle subscription downgrade scheduling failed for tenant {TenantId}", tenant.Id);
            throw new InvalidOperationException(
                "Could not schedule your plan change. Open Settings → Billing and try again.");
        }

        var marker = PaddleSubscriptionChangeScheduler.BuildScheduleMarker(subscription.Id, newPriceId);
        PaddleTenantBillingSync.ApplySubscription(tenant, subscription, _settings);
        PaddleSubscriptionChangeScheduler.ApplyScheduledDowngradeState(
            tenant,
            command.Plan,
            command.Interval,
            periodEnd,
            marker);
        await dbContext.SaveChangesAsync(cancellationToken);

        var effectiveAt = tenant.ScheduledPlanEffectiveAt ?? periodEnd;
        var currentPlanName = tenant.Plan.ToString();
        var targetPlanName = command.Plan.ToString();
        var tierDowngrade = TenantBillingPlanSync.IsPaidPlanDowngrade(tenant.Plan, command.Plan);
        var intervalDowngrade = TenantBillingPlanSync.IsBillingIntervalDowngrade(
            tenant.BillingInterval,
            command.Interval);
        var intervalOnlyChange = tenant.Plan == command.Plan && intervalDowngrade;
        var disclaimer = intervalOnlyChange
            ? $"Your billing interval will change to monthly on {effectiveAt:MMMM d, yyyy}. "
              + $"You keep {currentPlanName} access on yearly billing until then."
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
        CancellationToken cancellationToken)
    {
        var includeTrial = !tenant.HasConsumedTrial;
        DateTimeOffset? projectedTrialEnd = includeTrial
            ? DateTimeOffset.UtcNow.AddDays(_settings.TrialPeriodDays)
            : null;

        PaddleSubscription subscription;
        try
        {
            subscription = await paddleClient.CreateSubscriptionAsync(
                tenant.PaddleCustomerId!,
                priceId,
                BuildCustomData(tenant, command),
                cancellationToken);
            if (!includeTrial)
            {
                subscription = await MaybeStripConsumedTrialAsync(tenant, subscription, alreadyConsumed: true, cancellationToken);
            }
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(
                ex,
                "Subscription create with saved payment method failed for tenant {TenantId}",
                tenant.Id);
            throw new InvalidOperationException(
                "Could not start your subscription with the saved payment method. Add a card in billing settings or continue to checkout.");
        }

        await ApplyLiveSubscriptionAsync(tenant, subscription, cancellationToken);

        var disclaimer = projectedTrialEnd is null
            ? "Your subscription is active. Your saved payment method will be charged."
            : TenantBillingPlanSync.BuildTrialDisclaimer(projectedTrialEnd.Value);

        return new CheckoutSessionDto(
            BuildInAppSuccessUrl(command.SuccessUrl, disclaimer),
            tenant.TrialEndsAt ?? projectedTrialEnd,
            includeTrial,
            disclaimer,
            CompletedInApp: true);
    }

    private async Task UpdateSubscriptionCancelAtPeriodEndAsync(
        Guid tenantId,
        string operatorEmail,
        bool cancelAtPeriodEnd,
        CancellationToken cancellationToken)
    {
        await ValidateBillingAccessAsync(tenantId, operatorEmail, cancellationToken);
        EnsureConfigured();

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        if (tenant.IsComplimentary)
        {
            throw new InvalidOperationException("Complimentary tenants do not manage subscriptions.");
        }

        if (string.IsNullOrWhiteSpace(tenant.PaddleSubscriptionId))
        {
            throw new InvalidOperationException("This workspace has no active subscription.");
        }

        PaddleSubscription subscription;
        try
        {
            subscription = await paddleClient.GetSubscriptionAsync(tenant.PaddleSubscriptionId, cancellationToken)
                ?? throw new InvalidOperationException(
                    "Could not load your current subscription. Open Settings → Billing and try again.");
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(
                ex,
                "Could not load Paddle subscription {SubscriptionId} for tenant {TenantId}",
                tenant.PaddleSubscriptionId,
                tenant.Id);
            throw new InvalidOperationException(
                "Could not load your current subscription. Open Settings → Billing and try again.");
        }

        var scheduleId = PaddleSubscriptionChangeScheduler.ResolveScheduleId(tenant, subscription);
        var releasedSchedule = false;
        if (PaddleSubscriptionChangeScheduler.ShouldReleaseScheduleBeforeCancelAtPeriodEnd(
                cancelAtPeriodEnd,
                scheduleId))
        {
            var currentPriceId = TenantBillingPlanSync.ResolvePriceId(
                tenant.Plan,
                tenant.BillingInterval ?? BillingInterval.Monthly,
                _settings);
            if (!string.IsNullOrWhiteSpace(currentPriceId))
            {
                try
                {
                    subscription = await paddleClient.UpdateSubscriptionItemsAsync(
                        subscription.Id,
                        currentPriceId,
                        "immediately",
                        "do_not_bill",
                        cancellationToken: cancellationToken);
                }
                catch (PaddleApiException ex)
                {
                    logger.LogWarning(
                        ex,
                        "Paddle schedule release failed before cancel-at-period-end for tenant {TenantId}",
                        tenant.Id);
                    throw new InvalidOperationException(
                        "Could not clear the scheduled plan change before canceling. Undo the scheduled change and try again.");
                }
            }

            PaddleSubscriptionChangeScheduler.ClearScheduledDowngradeState(tenant);
            releasedSchedule = true;
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        else if (cancelAtPeriodEnd
            && PaddleSubscriptionChangeScheduler.HasActiveScheduledPaidDowngrade(tenant))
        {
            PaddleSubscriptionChangeScheduler.ClearScheduledDowngradeState(tenant);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        else if (PaddleSubscriptionChangeScheduler.ShouldClearStaleScheduledStateOnResume(
                     cancelAtPeriodEnd,
                     scheduleId,
                     tenant))
        {
            PaddleSubscriptionChangeScheduler.ClearScheduledDowngradeState(tenant);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        try
        {
            subscription = cancelAtPeriodEnd
                ? await paddleClient.CancelSubscriptionAtPeriodEndAsync(subscription.Id, cancellationToken)
                : await paddleClient.ClearScheduledChangeAsync(subscription.Id, cancellationToken);
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(
                ex,
                "Subscription cancel-at-period-end update failed for tenant {TenantId}",
                tenant.Id);
            throw new InvalidOperationException(
                !releasedSchedule && scheduleId is not null
                    ? "Could not schedule cancellation while a plan change is pending. Undo the scheduled change and try again."
                    : "Could not update subscription cancellation.");
        }

        PaddleTenantBillingSync.ApplySubscription(tenant, subscription, _settings);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task ApplyLiveSubscriptionAsync(
        Tenant tenant,
        PaddleSubscription subscription,
        CancellationToken cancellationToken)
    {
        var alreadyConsumed = tenant.HasConsumedTrial;
        subscription = await MaybeStripConsumedTrialAsync(tenant, subscription, alreadyConsumed, cancellationToken);
        PaddleTenantBillingSync.ApplySubscription(tenant, subscription, _settings);
        await dbContext.SaveChangesAsync(cancellationToken);
        await EnsurePaidSitePageIfNeededAsync(tenant, cancellationToken);
    }

    private async Task<PaddleSubscription> MaybeStripConsumedTrialAsync(
        Tenant tenant,
        PaddleSubscription subscription,
        bool alreadyConsumed,
        CancellationToken cancellationToken)
    {
        if (!alreadyConsumed)
        {
            return subscription;
        }

        var trialEnd = PaddleTenantBillingSync.ResolveTrialEnd(subscription);
        var stillTrialing = string.Equals(subscription.Status, "trialing", StringComparison.OrdinalIgnoreCase)
            || (trialEnd is { } end && end > DateTimeOffset.UtcNow);
        if (!stillTrialing)
        {
            return subscription;
        }

        try
        {
            return await paddleClient.EndTrialNowAsync(subscription.Id, cancellationToken);
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(
                ex,
                "Could not end a repeat trial for tenant {TenantId} subscription {SubscriptionId}",
                tenant.Id,
                subscription.Id);
            return subscription;
        }
    }

    private async Task<PaddleSubscription?> TryResolveSubscriptionFromTransactionAsync(
        Tenant tenant,
        string transactionId,
        CancellationToken cancellationToken)
    {
        try
        {
            var transaction = await paddleClient.GetTransactionAsync(transactionId, cancellationToken);
            if (transaction is null)
            {
                return null;
            }

            var customData = PaddleJson.ReadCustomData(transaction.CustomData);
            if (PaddleJson.TryGetGuid(customData, "tenant_id", out var metadataTenantId)
                && metadataTenantId != tenant.Id)
            {
                logger.LogWarning(
                    "Checkout transaction {TransactionId} tenant mismatch for tenant {TenantId}",
                    transactionId,
                    tenant.Id);
                return null;
            }

            PaddleTenantBillingSync.ApplyTransaction(tenant, transaction);
            await dbContext.SaveChangesAsync(cancellationToken);

            if (string.IsNullOrWhiteSpace(transaction.SubscriptionId))
            {
                return null;
            }

            return await paddleClient.GetSubscriptionAsync(transaction.SubscriptionId, cancellationToken);
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(
                ex,
                "Could not resolve checkout transaction {TransactionId} for tenant {TenantId}",
                transactionId,
                tenant.Id);
            return null;
        }
    }

    private async Task<PaddleSubscription?> TryResolveSubscriptionFromTenantAsync(
        Tenant tenant,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(tenant.PaddleSubscriptionId))
        {
            try
            {
                return await paddleClient.GetSubscriptionAsync(tenant.PaddleSubscriptionId, cancellationToken);
            }
            catch (PaddleApiException ex)
            {
                logger.LogWarning(
                    ex,
                    "Could not fetch Paddle subscription {SubscriptionId} for tenant {TenantId}",
                    tenant.PaddleSubscriptionId,
                    tenant.Id);
            }
        }

        if (string.IsNullOrWhiteSpace(tenant.PaddleCustomerId))
        {
            return null;
        }

        try
        {
            var subscriptions = await paddleClient.ListSubscriptionsAsync(
                tenant.PaddleCustomerId,
                cancellationToken);
            return subscriptions
                .Where(s => PaddleTenantBillingSync.IsLivePaidStatus(s.Status))
                .OrderByDescending(s => s.NextBilledAt ?? DateTimeOffset.MinValue)
                .FirstOrDefault();
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(
                ex,
                "Could not list Paddle subscriptions for customer {CustomerId} tenant {TenantId}",
                tenant.PaddleCustomerId,
                tenant.Id);
            return null;
        }
    }

    private async Task EnsurePaddleCustomerForOperatorAsync(
        Tenant tenant,
        string operatorEmail,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(operatorEmail))
        {
            throw new InvalidOperationException("Signed-in operator email is required.");
        }

        var normalizedEmail = operatorEmail.Trim();
        var customData = new Dictionary<string, string>
        {
            ["tenant_id"] = tenant.Id.ToString(),
            ["tenant_slug"] = tenant.Slug,
        };

        if (string.IsNullOrWhiteSpace(tenant.PaddleCustomerId))
        {
            try
            {
                var customer = await paddleClient.CreateCustomerAsync(
                    normalizedEmail,
                    tenant.Name,
                    customData,
                    cancellationToken);
                if (string.IsNullOrWhiteSpace(customer.Id))
                {
                    throw new InvalidOperationException("Paddle did not return a customer id.");
                }

                tenant.PaddleCustomerId = customer.Id;
                tenant.UpdatedAt = DateTimeOffset.UtcNow;
                await dbContext.SaveChangesAsync(cancellationToken);
                return;
            }
            catch (PaddleApiException ex)
            {
                logger.LogWarning(ex, "Paddle customer creation failed for tenant {TenantId}", tenant.Id);
                throw new InvalidOperationException("Could not create a billing customer for this workspace.");
            }
        }

        try
        {
            var existing = await paddleClient.GetCustomerAsync(tenant.PaddleCustomerId, cancellationToken);
            if (existing is not null
                && string.Equals(existing.Email, normalizedEmail, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            await paddleClient.UpdateCustomerAsync(
                tenant.PaddleCustomerId,
                normalizedEmail,
                string.IsNullOrWhiteSpace(existing?.Name) ? tenant.Name : existing!.Name,
                cancellationToken);
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(ex, "Paddle customer email sync failed for tenant {TenantId}", tenant.Id);
            throw new InvalidOperationException("Could not sync billing email for this workspace.");
        }
    }

    private async Task<BillingContactDto?> FetchPaddleContactAsync(
        string customerId,
        CancellationToken cancellationToken)
    {
        try
        {
            var customer = await paddleClient.GetCustomerAsync(customerId, cancellationToken);
            return customer is null
                ? null
                : new BillingContactDto(customer.Name ?? string.Empty, customer.Email ?? string.Empty, null);
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(ex, "Could not fetch Paddle customer {CustomerId}", customerId);
            return null;
        }
    }

    private async Task<BillingPaymentMethodDto?> FetchDefaultPaymentMethodAsync(
        string customerId,
        CancellationToken cancellationToken)
    {
        try
        {
            var methods = await paddleClient.ListPaymentMethodsAsync(customerId, cancellationToken);
            var card = methods.FirstOrDefault(method => method.Card is not null);
            if (card?.Card is null)
            {
                return null;
            }

            return new BillingPaymentMethodDto(
                card.Id,
                card.Card.Type ?? "card",
                card.Card.Last4 ?? "????",
                card.Card.ExpiryMonth ?? 0,
                card.Card.ExpiryYear ?? 0);
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(ex, "Could not list payment methods for customer {CustomerId}", customerId);
            return null;
        }
    }

    private async Task<BillingSubscriptionDetailsDto?> FetchSubscriptionDetailsAsync(
        Tenant tenant,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(tenant.PaddleSubscriptionId))
        {
            return BuildLocalSubscription(tenant);
        }

        try
        {
            var subscription = await paddleClient.GetSubscriptionAsync(
                tenant.PaddleSubscriptionId,
                cancellationToken);
            if (subscription is null)
            {
                return BuildLocalSubscription(tenant);
            }

            return new BillingSubscriptionDetailsDto(
                PaddleSubscriptionChangeScheduler.SubscriptionHasCancelAtPeriodEnd(subscription),
                PaddleTenantBillingSync.ResolvePeriodEnd(subscription),
                tenant.ScheduledPlan?.ToString(),
                tenant.ScheduledPlanEffectiveAt);
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(
                ex,
                "Could not fetch subscription {SubscriptionId} for tenant {TenantId}",
                tenant.PaddleSubscriptionId,
                tenant.Id);
            return BuildLocalSubscription(tenant);
        }
    }

    private async Task<IReadOnlyList<BillingInvoiceDto>> FetchInvoicesAsync(
        string customerId,
        CancellationToken cancellationToken)
    {
        try
        {
            var transactions = await paddleClient.ListTransactionsAsync(customerId, cancellationToken);
            var invoices = new List<BillingInvoiceDto>();
            foreach (var transaction in transactions
                         .Where(t => t.Status is "completed" or "paid" or "billed")
                         .Take(24))
            {
                long amount = 0;
                if (long.TryParse(transaction.Details?.Totals?.Total, out var parsed))
                {
                    amount = parsed;
                }

                string? invoiceUrl = null;
                try
                {
                    invoiceUrl = await paddleClient.GetTransactionInvoiceUrlAsync(transaction.Id, cancellationToken);
                }
                catch (PaddleApiException)
                {
                    invoiceUrl = transaction.Checkout?.Url;
                }

                invoices.Add(new BillingInvoiceDto(
                    transaction.Id,
                    transaction.BilledAt ?? transaction.CreatedAt ?? DateTimeOffset.UtcNow,
                    amount,
                    transaction.Details?.Totals?.CurrencyCode ?? "usd",
                    transaction.Status,
                    invoiceUrl,
                    invoiceUrl));
            }

            return invoices;
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(ex, "Could not list invoices for customer {CustomerId}", customerId);
            return [];
        }
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

        if (!string.IsNullOrWhiteSpace(tenant.PaddleSubscriptionId))
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
        tenant.PaddleSubscriptionScheduleId = null;
        tenant.UpdatedAt = DateTimeOffset.UtcNow;
        return true;
    }

    private static bool CanUpgradeExistingSubscription(Tenant tenant) =>
        !string.IsNullOrWhiteSpace(tenant.PaddleSubscriptionId)
        && tenant.Plan is TenantPlan.Core or TenantPlan.Pro
        && tenant.BillingStatus is BillingStatus.Trialing
            or BillingStatus.Active
            or BillingStatus.PastDue;

    private static Dictionary<string, string> BuildCustomData(Tenant tenant, CreateCheckoutSessionCommand command) =>
        new()
        {
            ["tenant_id"] = tenant.Id.ToString(),
            ["tenant_slug"] = command.TenantSlug,
            ["plan"] = command.Plan.ToString(),
            ["interval"] = command.Interval.ToString(),
        };

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

    private void EnsureConfigured()
    {
        if (!_settings.IsConfigured)
        {
            throw new InvalidOperationException("Paddle is not configured.");
        }
    }

    private static BillingPlanLimitsDto MapPlanLimits(PlanLimits limits) =>
        new(limits.Seats, limits.Communities, limits.PublishedActivities, limits.RegistrationsPerMonth);

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
}
