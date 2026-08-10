using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Stripe;

namespace Cohestra.Infrastructure.Billing;

internal static class StripeSubscriptionDowngradeScheduler
{
    internal static async Task<SubscriptionSchedule> SchedulePaidDowngradeAtPeriodEndAsync(
        Subscription subscription,
        string currentPriceId,
        string targetPriceId,
        IReadOnlyDictionary<string, string> metadata,
        CancellationToken cancellationToken)
    {
        var scheduleService = new SubscriptionScheduleService();
        var schedule = await GetOrCreateScheduleAsync(scheduleService, subscription, cancellationToken);

        var currentPhase = schedule.Phases?.FirstOrDefault();
        var currentItem = subscription.Items?.Data?.FirstOrDefault()
            ?? throw new InvalidOperationException("Stripe subscription has no billable items.");

        var phaseStart = currentPhase?.StartDate
            ?? ToUtcDateTime(currentItem.CurrentPeriodStart)
            ?? throw new InvalidOperationException("Could not determine the current billing phase start.");

        var phaseEnd = currentPhase?.EndDate
            ?? ToUtcDateTime(currentItem.CurrentPeriodEnd)
            ?? throw new InvalidOperationException("Could not determine the current billing phase end.");

        return await scheduleService.UpdateAsync(
            schedule.Id,
            new SubscriptionScheduleUpdateOptions
            {
                EndBehavior = "release",
                Metadata = metadata.ToDictionary(static pair => pair.Key, static pair => pair.Value),
                Phases =
                [
                    new SubscriptionSchedulePhaseOptions
                    {
                        Items =
                        [
                            new SubscriptionSchedulePhaseItemOptions
                            {
                                Price = currentPriceId,
                                Quantity = 1,
                            },
                        ],
                        StartDate = phaseStart,
                        EndDate = phaseEnd,
                        ProrationBehavior = "none",
                    },
                    new SubscriptionSchedulePhaseOptions
                    {
                        Items =
                        [
                            new SubscriptionSchedulePhaseItemOptions
                            {
                                Price = targetPriceId,
                                Quantity = 1,
                            },
                        ],
                        ProrationBehavior = "none",
                    },
                ],
            },
            cancellationToken: cancellationToken);
    }

    internal static Task ReleaseScheduleAsync(
        string scheduleId,
        CancellationToken cancellationToken)
    {
        var scheduleService = new SubscriptionScheduleService();
        return scheduleService.ReleaseAsync(scheduleId, cancellationToken: cancellationToken);
    }

    internal static void ApplyScheduledDowngradeState(
        Tenant tenant,
        TenantPlan targetPlan,
        BillingInterval targetInterval,
        DateTimeOffset effectiveAt,
        string scheduleId)
    {
        tenant.ScheduledPlan = targetPlan;
        tenant.ScheduledPlanEffectiveAt = effectiveAt;
        tenant.ScheduledBillingInterval = targetInterval;
        tenant.StripeSubscriptionScheduleId = scheduleId;
        tenant.UpdatedAt = DateTimeOffset.UtcNow;
    }

    internal static void ClearScheduledDowngradeState(Tenant tenant)
    {
        tenant.ScheduledPlan = null;
        tenant.ScheduledPlanEffectiveAt = null;
        tenant.ScheduledBillingInterval = null;
        tenant.StripeSubscriptionScheduleId = null;
        tenant.UpdatedAt = DateTimeOffset.UtcNow;
    }

    internal static bool HasActiveScheduledPaidDowngrade(Tenant tenant) =>
        tenant.ScheduledPlan is TenantPlan.Core or TenantPlan.Pro
        && tenant.ScheduledPlanEffectiveAt is not null
        && tenant.ScheduledPlanEffectiveAt > DateTimeOffset.UtcNow
        && !string.IsNullOrWhiteSpace(tenant.StripeSubscriptionScheduleId);

    internal static string? ResolveScheduleId(Tenant tenant, Subscription subscription) =>
        string.IsNullOrWhiteSpace(tenant.StripeSubscriptionScheduleId)
            ? subscription.ScheduleId
            : tenant.StripeSubscriptionScheduleId;

    internal static bool ShouldReleaseScheduleBeforeCancelAtPeriodEnd(
        bool cancelAtPeriodEnd,
        string? scheduleId) =>
        cancelAtPeriodEnd && !string.IsNullOrWhiteSpace(scheduleId);

    internal static async Task ReleaseScheduleIfPresentAsync(
        string scheduleId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(scheduleId))
        {
            return;
        }

        await ReleaseScheduleAsync(scheduleId, cancellationToken);
    }

    private static async Task<SubscriptionSchedule> GetOrCreateScheduleAsync(
        SubscriptionScheduleService scheduleService,
        Subscription subscription,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(subscription.ScheduleId))
        {
            return await scheduleService.GetAsync(subscription.ScheduleId, cancellationToken: cancellationToken);
        }

        return await scheduleService.CreateAsync(
            new SubscriptionScheduleCreateOptions { FromSubscription = subscription.Id },
            cancellationToken: cancellationToken);
    }

    private static DateTime? ToUtcDateTime(DateTime? value) =>
        value is null
            ? null
            : DateTime.SpecifyKind(value.Value, DateTimeKind.Utc);
}
