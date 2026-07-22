using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Stripe;
using Stripe.Checkout;

namespace Cohestra.Infrastructure.Billing;

public static class StripeTenantBillingSync
{
    public static void ApplySubscription(Tenant tenant, Subscription subscription, StripeSettings settings)
    {
        tenant.StripeCustomerId = subscription.CustomerId ?? tenant.StripeCustomerId;
        tenant.StripeSubscriptionId = subscription.Id;

        var priceId = subscription.Items?.Data?.FirstOrDefault()?.Price?.Id;
        if (!string.IsNullOrWhiteSpace(priceId))
        {
            if (TryMapPrice(priceId, settings, out var plan, out var interval))
            {
                tenant.Plan = plan;
                tenant.BillingInterval = interval;
            }
        }

        tenant.BillingStatus = MapSubscriptionStatus(subscription.Status);
        tenant.TrialEndsAt = subscription.TrialEnd is null
            ? tenant.TrialEndsAt
            : new DateTimeOffset(DateTime.SpecifyKind(subscription.TrialEnd.Value, DateTimeKind.Utc));

        if (subscription.Status is "trialing" or "active" && subscription.TrialEnd is not null)
        {
            tenant.HasConsumedTrial = true;
        }

        tenant.UpdatedAt = DateTimeOffset.UtcNow;
    }

    public static void ApplyCheckoutSession(Tenant tenant, Session session, StripeSettings settings)
    {
        tenant.StripeCustomerId = session.CustomerId ?? tenant.StripeCustomerId;
        tenant.StripeSubscriptionId = session.SubscriptionId ?? tenant.StripeSubscriptionId;
        tenant.UpdatedAt = DateTimeOffset.UtcNow;

        _ = session;
        _ = settings;
    }

    public static void ApplySubscriptionDeleted(Tenant tenant)
    {
        tenant.Plan = TenantPlan.Basic;
        tenant.BillingStatus = BillingStatus.Free;
        tenant.BillingInterval = null;
        tenant.StripeSubscriptionId = null;
        tenant.TrialEndsAt = null;
        tenant.DelinquencyStartedAt = null;
        tenant.UpdatedAt = DateTimeOffset.UtcNow;
    }

    public static void ApplyInvoicePaid(Tenant tenant)
    {
        if (tenant.BillingStatus is BillingStatus.PastDue or BillingStatus.OnHold)
        {
            tenant.BillingStatus = BillingStatus.Active;
            tenant.DelinquencyStartedAt = null;
            tenant.UpdatedAt = DateTimeOffset.UtcNow;
        }
    }

    public static void ApplyInvoicePaymentFailed(Tenant tenant)
    {
        tenant.BillingStatus = BillingStatus.PastDue;
        tenant.DelinquencyStartedAt ??= DateTimeOffset.UtcNow;
        tenant.UpdatedAt = DateTimeOffset.UtcNow;
    }

    public static BillingStatus MapSubscriptionStatus(string? status) =>
        status switch
        {
            "trialing" => BillingStatus.Trialing,
            "active" => BillingStatus.Active,
            "past_due" => BillingStatus.PastDue,
            "unpaid" => BillingStatus.OnHold,
            "canceled" => BillingStatus.Canceled,
            _ => BillingStatus.Active,
        };

    public static bool TryMapPrice(
        string priceId,
        StripeSettings settings,
        out TenantPlan plan,
        out BillingInterval interval)
    {
        if (string.Equals(priceId, settings.PriceCoreMonthly, StringComparison.Ordinal))
        {
            plan = TenantPlan.Core;
            interval = BillingInterval.Monthly;
            return true;
        }

        if (string.Equals(priceId, settings.PriceCoreAnnual, StringComparison.Ordinal))
        {
            plan = TenantPlan.Core;
            interval = BillingInterval.Annual;
            return true;
        }

        if (string.Equals(priceId, settings.PriceProMonthly, StringComparison.Ordinal))
        {
            plan = TenantPlan.Pro;
            interval = BillingInterval.Monthly;
            return true;
        }

        if (string.Equals(priceId, settings.PriceProAnnual, StringComparison.Ordinal))
        {
            plan = TenantPlan.Pro;
            interval = BillingInterval.Annual;
            return true;
        }

        plan = TenantPlan.Basic;
        interval = BillingInterval.Monthly;
        return false;
    }

    public static string? ResolvePriceId(TenantPlan plan, BillingInterval interval, StripeSettings settings) =>
        (plan, interval) switch
        {
            (TenantPlan.Core, BillingInterval.Monthly) => NullIfEmpty(settings.PriceCoreMonthly),
            (TenantPlan.Core, BillingInterval.Annual) => NullIfEmpty(settings.PriceCoreAnnual),
            (TenantPlan.Pro, BillingInterval.Monthly) => NullIfEmpty(settings.PriceProMonthly),
            (TenantPlan.Pro, BillingInterval.Annual) => NullIfEmpty(settings.PriceProAnnual),
            _ => null,
        };

    public static string BuildTrialDisclaimer(DateTimeOffset trialEndDate) =>
        $"You will not be charged while your trial is active. Billing starts on {trialEndDate:MMMM d, yyyy} unless you cancel before then.";

    private static string? NullIfEmpty(string value) =>
        string.IsNullOrWhiteSpace(value) ? null : value;
}
