using System.Text.Json;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Billing;

internal static class PaddleTenantBillingSync
{
    public static void ApplySubscription(Tenant tenant, PaddleSubscription subscription, PaddleSettings settings)
    {
        tenant.PaddleCustomerId = subscription.CustomerId ?? tenant.PaddleCustomerId;
        tenant.PaddleSubscriptionId = subscription.Id;

        var periodEnd = ResolvePeriodEnd(subscription);
        var priceId = subscription.Items.FirstOrDefault()?.Price?.Id;
        TenantPlan? mappedPlan = null;
        BillingInterval? mappedInterval = null;

        if (!string.IsNullOrWhiteSpace(priceId)
            && TenantBillingPlanSync.TryMapPrice(priceId, settings, out var plan, out var interval))
        {
            mappedPlan = plan;
            mappedInterval = interval;
        }
        else if (TryMapPlanFromCustomData(subscription.CustomData, out var metadataPlan, out var metadataInterval))
        {
            mappedPlan = metadataPlan;
            mappedInterval = metadataInterval;
        }

        tenant.BillingStatus = MapSubscriptionStatus(subscription, ResolveTrialEnd(subscription));

        var trialEnd = ResolveTrialEnd(subscription);
        if (trialEnd is not null)
        {
            tenant.TrialEndsAt = trialEnd;
        }

        if (tenant.BillingStatus is BillingStatus.Trialing
            || (tenant.BillingStatus is BillingStatus.Active && trialEnd is not null))
        {
            tenant.HasConsumedTrial = true;
        }

        if (PaddleSubscriptionChangeScheduler.SubscriptionHasCancelAtPeriodEnd(subscription)
            && periodEnd is not null)
        {
            tenant.ScheduledPlan = TenantPlan.Basic;
            tenant.ScheduledPlanEffectiveAt = periodEnd;
        }
        else if (mappedPlan is { } targetPlan
            && targetPlan != tenant.Plan
            && periodEnd is not null
            && periodEnd > DateTimeOffset.UtcNow
            && TenantBillingPlanSync.IsPaidPlanDowngrade(tenant.Plan, targetPlan))
        {
            tenant.ScheduledPlan = targetPlan;
            tenant.ScheduledPlanEffectiveAt = periodEnd;
            if (mappedInterval is not null)
            {
                tenant.ScheduledBillingInterval = mappedInterval;
            }
        }
        else
        {
            if (!PaddleSubscriptionChangeScheduler.HasActiveScheduledPaidDowngrade(tenant))
            {
                tenant.ScheduledPlan = null;
                tenant.ScheduledPlanEffectiveAt = null;
                tenant.ScheduledBillingInterval = null;
                tenant.PaddleSubscriptionScheduleId = null;
            }

            if (CanApplyPlanEntitlement(subscription.Status))
            {
                if (mappedPlan is not null)
                {
                    tenant.Plan = mappedPlan.Value;
                }

                if (mappedInterval is not null)
                {
                    tenant.BillingInterval = mappedInterval;
                }
            }
        }

        if (periodEnd is not null
            && tenant.ScheduledPlanEffectiveAt is not null
            && DateTimeOffset.UtcNow >= tenant.ScheduledPlanEffectiveAt
            && tenant.ScheduledPlan is TenantPlan scheduled)
        {
            TenantBillingPlanSync.ApplyScheduledPlan(tenant, scheduled);
        }

        tenant.UpdatedAt = DateTimeOffset.UtcNow;
    }

    public static void ApplyTransaction(Tenant tenant, PaddleTransaction transaction)
    {
        tenant.PaddleCustomerId = transaction.CustomerId ?? tenant.PaddleCustomerId;
        tenant.PaddleSubscriptionId = transaction.SubscriptionId ?? tenant.PaddleSubscriptionId;
        tenant.UpdatedAt = DateTimeOffset.UtcNow;
    }

    public static BillingStatus MapSubscriptionStatus(PaddleSubscription subscription, DateTimeOffset? trialEnd)
    {
        if (string.Equals(subscription.Status, "active", StringComparison.OrdinalIgnoreCase)
            && trialEnd is { } end
            && end > DateTimeOffset.UtcNow)
        {
            return BillingStatus.Trialing;
        }

        return subscription.Status?.Trim().ToLowerInvariant() switch
        {
            "trialing" => BillingStatus.Trialing,
            "active" => BillingStatus.Active,
            "past_due" => BillingStatus.PastDue,
            "paused" => BillingStatus.OnHold,
            "canceled" or "cancelled" => BillingStatus.Canceled,
            _ => BillingStatus.Canceled,
        };
    }

    internal static bool CanApplyPlanEntitlement(string? status) =>
        status is "trialing" or "active" or "past_due";

    public static bool TryMapPlanFromCustomData(
        JsonElement customData,
        out TenantPlan plan,
        out BillingInterval? interval)
    {
        var data = PaddleJson.ReadCustomData(customData);
        return TryMapPlanFromMetadata(data, out plan, out interval);
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

    internal static DateTimeOffset? ResolvePeriodEnd(PaddleSubscription subscription)
    {
        if (subscription.ScheduledChange?.EffectiveAt is { } scheduled)
        {
            return scheduled;
        }

        if (subscription.CurrentBillingPeriod?.EndsAt is { } periodEnd)
        {
            return periodEnd;
        }

        if (subscription.Items.FirstOrDefault()?.NextBilledAt is { } itemNext)
        {
            return itemNext;
        }

        return subscription.NextBilledAt;
    }

    internal static DateTimeOffset? ResolveTrialEnd(PaddleSubscription subscription)
    {
        if (subscription.Items.FirstOrDefault()?.TrialDates?.EndsAt is { } itemTrial)
        {
            return itemTrial;
        }

        return subscription.TrialDates?.EndsAt;
    }

    internal static bool IsLivePaidStatus(string? status) =>
        status is "trialing" or "active" or "past_due";
}
