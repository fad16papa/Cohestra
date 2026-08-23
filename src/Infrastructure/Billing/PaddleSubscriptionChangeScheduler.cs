using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Billing;

internal static class PaddleSubscriptionChangeScheduler
{
    internal static void ApplyScheduledDowngradeState(
        Tenant tenant,
        TenantPlan targetPlan,
        BillingInterval targetInterval,
        DateTimeOffset effectiveAt,
        string scheduleMarker)
    {
        tenant.ScheduledPlan = targetPlan;
        tenant.ScheduledPlanEffectiveAt = effectiveAt;
        tenant.ScheduledBillingInterval = targetInterval;
        tenant.PaddleSubscriptionScheduleId = scheduleMarker;
        tenant.UpdatedAt = DateTimeOffset.UtcNow;
    }

    internal static void ClearScheduledDowngradeState(Tenant tenant)
    {
        tenant.ScheduledPlan = null;
        tenant.ScheduledPlanEffectiveAt = null;
        tenant.ScheduledBillingInterval = null;
        tenant.PaddleSubscriptionScheduleId = null;
        tenant.UpdatedAt = DateTimeOffset.UtcNow;
    }

    internal static bool HasActiveScheduledPaidDowngrade(Tenant tenant) =>
        tenant.ScheduledPlan is TenantPlan.Core or TenantPlan.Pro
        && tenant.ScheduledPlanEffectiveAt is not null
        && tenant.ScheduledPlanEffectiveAt > DateTimeOffset.UtcNow
        && !string.IsNullOrWhiteSpace(tenant.PaddleSubscriptionScheduleId);

    internal static string BuildScheduleMarker(string subscriptionId, string targetPriceId) =>
        $"sch:{subscriptionId}:{targetPriceId}";

    internal static string? ResolveScheduleId(Tenant tenant, PaddleSubscription subscription) =>
        string.IsNullOrWhiteSpace(tenant.PaddleSubscriptionScheduleId)
            ? null
            : tenant.PaddleSubscriptionScheduleId;

    internal static bool ShouldReleaseScheduleBeforeCancelAtPeriodEnd(
        bool cancelAtPeriodEnd,
        string? scheduleId) =>
        cancelAtPeriodEnd && !string.IsNullOrWhiteSpace(scheduleId);

    internal static bool ShouldClearStaleScheduledStateOnResume(
        bool cancelAtPeriodEnd,
        string? scheduleId,
        Tenant tenant) =>
        !cancelAtPeriodEnd
        && string.IsNullOrWhiteSpace(scheduleId)
        && tenant.ScheduledPlan is TenantPlan.Core or TenantPlan.Pro
        && tenant.ScheduledPlanEffectiveAt is not null;

    internal static bool SubscriptionHasCancelAtPeriodEnd(PaddleSubscription subscription) =>
        string.Equals(subscription.ScheduledChange?.Action, "cancel", StringComparison.OrdinalIgnoreCase);
}
