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

        var periodEnd = ResolvePeriodEnd(subscription);

        var priceId = subscription.Items?.Data?.FirstOrDefault()?.Price?.Id;
        TenantPlan? mappedPlan = null;
        BillingInterval? mappedInterval = null;

        if (!string.IsNullOrWhiteSpace(priceId)
            && TryMapPrice(priceId, settings, out var plan, out var interval))
        {
            mappedPlan = plan;
            mappedInterval = interval;
        }
        else if (TryMapPlanFromMetadata(subscription.Metadata, out var metadataPlan, out var metadataInterval))
        {
            mappedPlan = metadataPlan;
            mappedInterval = metadataInterval;
        }

        tenant.BillingStatus = MapSubscriptionStatus(subscription.Status);
        tenant.TrialEndsAt = subscription.TrialEnd is null
            ? tenant.TrialEndsAt
            : new DateTimeOffset(DateTime.SpecifyKind(subscription.TrialEnd.Value, DateTimeKind.Utc));

        if (subscription.Status is "trialing")
        {
            tenant.HasConsumedTrial = true;
        }
        else if (subscription.Status is "active" && subscription.TrialEnd is not null)
        {
            tenant.HasConsumedTrial = true;
        }

        if (subscription.CancelAtPeriodEnd && periodEnd is not null)
        {
            tenant.ScheduledPlan = TenantPlan.Basic;
            tenant.ScheduledPlanEffectiveAt = periodEnd;
        }
        else if (mappedPlan is { } targetPlan
            && targetPlan != tenant.Plan
            && periodEnd is not null
            && periodEnd > DateTimeOffset.UtcNow
            && IsDowngrade(tenant.Plan, targetPlan))
        {
            tenant.ScheduledPlan = targetPlan;
            tenant.ScheduledPlanEffectiveAt = periodEnd;
        }
        else
        {
            tenant.ScheduledPlan = null;
            tenant.ScheduledPlanEffectiveAt = null;

            if (mappedPlan is not null)
            {
                tenant.Plan = mappedPlan.Value;
            }

            if (mappedInterval is not null)
            {
                tenant.BillingInterval = mappedInterval;
            }
        }

        if (periodEnd is not null
            && tenant.ScheduledPlanEffectiveAt is not null
            && DateTimeOffset.UtcNow >= tenant.ScheduledPlanEffectiveAt
            && tenant.ScheduledPlan is TenantPlan scheduled)
        {
            ApplyScheduledPlan(tenant, scheduled);
        }

        tenant.UpdatedAt = DateTimeOffset.UtcNow;
    }

    public static void ApplyScheduledPlan(Tenant tenant, TenantPlan scheduledPlan)
    {
        tenant.Plan = scheduledPlan;
        tenant.ScheduledPlan = null;
        tenant.ScheduledPlanEffectiveAt = null;

        if (scheduledPlan == TenantPlan.Basic)
        {
            tenant.BillingStatus = BillingStatus.Free;
            tenant.BillingInterval = null;
            tenant.StripeSubscriptionId = null;
            tenant.TrialEndsAt = null;
        }

        tenant.UpdatedAt = DateTimeOffset.UtcNow;
    }

    private static bool IsDowngrade(TenantPlan current, TenantPlan target) =>
        (current, target) switch
        {
            (TenantPlan.Pro, TenantPlan.Core) => true,
            (TenantPlan.Pro, TenantPlan.Basic) => true,
            (TenantPlan.Core, TenantPlan.Basic) => true,
            _ => false,
        };

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
        if (tenant.ScheduledPlan is TenantPlan scheduled
            && tenant.ScheduledPlanEffectiveAt is not null
            && DateTimeOffset.UtcNow < tenant.ScheduledPlanEffectiveAt)
        {
            return;
        }

        tenant.Plan = TenantPlan.Basic;
        tenant.BillingStatus = BillingStatus.Free;
        tenant.BillingInterval = null;
        tenant.StripeSubscriptionId = null;
        tenant.TrialEndsAt = null;
        tenant.DelinquencyStartedAt = null;
        tenant.ScheduledPlan = null;
        tenant.ScheduledPlanEffectiveAt = null;
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
            "incomplete" => BillingStatus.Free,
            "incomplete_expired" => BillingStatus.Canceled,
            "paused" => BillingStatus.OnHold,
            _ => BillingStatus.Canceled,
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

    public static bool TryMapPlanFromMetadata(
        IReadOnlyDictionary<string, string>? metadata,
        out TenantPlan plan,
        out BillingInterval? interval)
    {
        interval = null;
        plan = TenantPlan.Basic;

        if (metadata is null
            || !metadata.TryGetValue("plan", out var planRaw)
            || !Enum.TryParse(planRaw, ignoreCase: true, out plan)
            || plan is not (TenantPlan.Core or TenantPlan.Pro))
        {
            return false;
        }

        if (metadata.TryGetValue("interval", out var intervalRaw))
        {
            var normalized = intervalRaw.Trim().ToLowerInvariant();
            interval = normalized switch
            {
                "monthly" or "month" => BillingInterval.Monthly,
                "annual" or "yearly" or "year" => BillingInterval.Annual,
                _ when Enum.TryParse(intervalRaw, ignoreCase: true, out BillingInterval parsed) => parsed,
                _ => null,
            };
        }

        return true;
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

    internal static DateTimeOffset? ResolvePeriodEnd(Subscription subscription)
    {
        if (subscription.CancelAt is DateTime cancelAt)
        {
            return new DateTimeOffset(DateTime.SpecifyKind(cancelAt, DateTimeKind.Utc));
        }

        var itemEnd = subscription.Items?.Data?.FirstOrDefault()?.CurrentPeriodEnd;
        if (itemEnd is DateTime itemPeriodEnd)
        {
            return new DateTimeOffset(DateTime.SpecifyKind(itemPeriodEnd, DateTimeKind.Utc));
        }

        if (subscription.BillingCycleAnchor is DateTime anchor)
        {
            return new DateTimeOffset(DateTime.SpecifyKind(anchor, DateTimeKind.Utc));
        }

        return null;
    }

    private static string? NullIfEmpty(string value) =>
        string.IsNullOrWhiteSpace(value) ? null : value;
}
