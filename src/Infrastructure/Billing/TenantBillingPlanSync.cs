using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Billing;

/// <summary>
/// Merchant-agnostic tenant plan/billing field helpers used by jobs and notifications.
/// Paddle subscription sync lands in Story 29.3.
/// </summary>
public static class TenantBillingPlanSync
{
    public static void ApplyScheduledPlan(Tenant tenant, TenantPlan scheduledPlan)
    {
        tenant.Plan = scheduledPlan;
        if (scheduledPlan is TenantPlan.Core or TenantPlan.Pro
            && tenant.ScheduledBillingInterval is { } scheduledInterval)
        {
            tenant.BillingInterval = scheduledInterval;
        }

        tenant.ScheduledPlan = null;
        tenant.ScheduledPlanEffectiveAt = null;
        tenant.ScheduledBillingInterval = null;
        tenant.PaddleSubscriptionScheduleId = null;

        if (scheduledPlan == TenantPlan.Basic)
        {
            tenant.BillingStatus = BillingStatus.Free;
            tenant.BillingInterval = null;
            tenant.PaddleSubscriptionId = null;
            tenant.TrialEndsAt = null;
        }

        tenant.UpdatedAt = DateTimeOffset.UtcNow;
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
        tenant.PaddleSubscriptionId = null;
        tenant.TrialEndsAt = null;
        tenant.DelinquencyStartedAt = null;
        tenant.ScheduledPlan = null;
        tenant.ScheduledPlanEffectiveAt = null;
        tenant.ScheduledBillingInterval = null;
        tenant.PaddleSubscriptionScheduleId = null;
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

    public static bool IsPaidPlanDowngrade(TenantPlan current, TenantPlan target) =>
        (current, target) switch
        {
            (TenantPlan.Pro, TenantPlan.Core) => true,
            (TenantPlan.Pro, TenantPlan.Basic) => true,
            (TenantPlan.Core, TenantPlan.Basic) => true,
            _ => false,
        };

    public static bool IsBillingIntervalDowngrade(BillingInterval? current, BillingInterval target) =>
        current == BillingInterval.Annual && target == BillingInterval.Monthly;

    public static bool ShouldDeferPlanChange(
        TenantPlan currentPlan,
        BillingInterval? currentInterval,
        TenantPlan targetPlan,
        BillingInterval targetInterval) =>
        IsPaidPlanDowngrade(currentPlan, targetPlan)
        || (currentPlan == targetPlan && IsBillingIntervalDowngrade(currentInterval, targetInterval));

    public static string? ResolvePriceId(TenantPlan plan, BillingInterval interval, PaddleSettings settings) =>
        (plan, interval) switch
        {
            (TenantPlan.Core, BillingInterval.Monthly) => NullIfEmpty(settings.PriceCoreMonthly),
            (TenantPlan.Core, BillingInterval.Annual) => NullIfEmpty(settings.PriceCoreAnnual),
            (TenantPlan.Pro, BillingInterval.Monthly) => NullIfEmpty(settings.PriceProMonthly),
            (TenantPlan.Pro, BillingInterval.Annual) => NullIfEmpty(settings.PriceProAnnual),
            _ => null,
        };

    public static bool TryMapPrice(
        string priceId,
        PaddleSettings settings,
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

    public static string BuildTrialDisclaimer(DateTimeOffset trialEndDate) =>
        $"You will not be charged while your trial is active. Billing starts on {trialEndDate:MMMM d, yyyy} unless you cancel before then.";

    private static string? NullIfEmpty(string value) =>
        string.IsNullOrWhiteSpace(value) ? null : value;
}
