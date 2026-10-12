using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Billing;

/// <summary>
/// Canonical subscription-change request for PREVIEW and APPLY. Preview and
/// confirm must use this builder so price, items, effective_from, and
/// proration_billing_mode cannot silently diverge.
/// </summary>
internal sealed record PaddleSubscriptionChangeRequest(
    string SubscriptionId,
    string TargetPriceId,
    string EffectiveFrom,
    string ProrationBillingMode,
    IReadOnlyDictionary<string, string> CustomData,
    string StateFingerprint,
    bool Deferred,
    TenantPlan CurrentPlan,
    BillingInterval CurrentInterval,
    TenantPlan TargetPlan,
    BillingInterval TargetInterval,
    string? Disclaimer);

internal static class PaddleSubscriptionChangePlanner
{
    public static PaddleSubscriptionChangeRequest Build(
        Tenant tenant,
        PaddleSubscription subscription,
        TenantPlan targetPlan,
        BillingInterval targetInterval,
        PaddleSettings settings,
        string tenantSlug)
    {
        if (targetPlan is not (TenantPlan.Core or TenantPlan.Pro))
        {
            throw new InvalidOperationException("Checkout is only available for Core or Pro plans.");
        }

        var targetPriceId = TenantBillingPlanSync.ResolvePriceId(targetPlan, targetInterval, settings)
            ?? throw new InvalidOperationException("Paddle price ID is not configured for the selected plan.");

        var currentPriceId = PaddleSubscriptionChangePolicy.CurrentPriceId(subscription);
        if (string.Equals(currentPriceId, targetPriceId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Your workspace is already on the selected plan and billing interval.");
        }

        if (string.IsNullOrWhiteSpace(currentPriceId)
            || !TenantBillingPlanSync.TryMapPrice(currentPriceId, settings, out var livePlan, out var liveInterval))
        {
            throw new InvalidOperationException(PaddleSubscriptionChangePolicy.UnknownIntervalMessage);
        }

        var deferred = TenantBillingPlanSync.ShouldDeferPlanChange(
            livePlan,
            liveInterval,
            targetPlan,
            targetInterval);

        var rejected = PaddleSubscriptionChangePolicy.RejectBeforeMutation(
            subscription,
            tenant.BillingStatus,
            allowPendingCancel: deferred);
        if (rejected is not null)
        {
            throw new InvalidOperationException(rejected);
        }

        var items = PaddleSubscriptionChangePolicy.RecurringItems(subscription);
        var quantity = items.Count == 1 ? items[0].Quantity : 0;
        var customData = new Dictionary<string, string>
        {
            ["tenant_id"] = tenant.Id.ToString(),
            ["tenant_slug"] = tenantSlug,
            ["plan"] = targetPlan.ToString(),
            ["interval"] = targetInterval.ToString(),
        };

        string effectiveFrom;
        string prorationBillingMode;
        string? disclaimer;
        if (deferred)
        {
            effectiveFrom = PaddleSubscriptionChangePolicy.NextBillingPeriod;
            prorationBillingMode = PaddleSubscriptionChangePolicy.DoNotBill;
            disclaimer = null;
        }
        else
        {
            var update = PaddleSubscriptionChangePolicy.ResolveImmediateUpdate(
                subscription,
                tenant.BillingStatus,
                liveInterval,
                targetInterval);
            effectiveFrom = update.EffectiveFrom;
            prorationBillingMode = update.ProrationBillingMode;
            disclaimer = update.Disclaimer;
        }

        var fingerprint = ComputeStateFingerprint(
            subscription.Id,
            subscription.Status,
            currentPriceId,
            items.Count,
            quantity,
            subscription.ScheduledChange?.Action,
            subscription.ScheduledChange?.EffectiveAt,
            liveInterval,
            targetPriceId,
            prorationBillingMode,
            effectiveFrom);

        return new PaddleSubscriptionChangeRequest(
            subscription.Id,
            targetPriceId,
            effectiveFrom,
            prorationBillingMode,
            customData,
            fingerprint,
            deferred,
            livePlan,
            liveInterval,
            targetPlan,
            targetInterval,
            disclaimer);
    }

    public static string ComputeStateFingerprint(
        string subscriptionId,
        string status,
        string currentPriceId,
        int itemCount,
        int quantity,
        string? scheduledAction,
        DateTimeOffset? scheduledAt,
        BillingInterval currentInterval,
        string targetPriceId,
        string prorationBillingMode,
        string effectiveFrom)
    {
        var scheduledAtRaw = scheduledAt?.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture) ?? string.Empty;
        var raw = string.Join(
            '|',
            subscriptionId,
            status,
            currentPriceId,
            itemCount.ToString(CultureInfo.InvariantCulture),
            quantity.ToString(CultureInfo.InvariantCulture),
            scheduledAction ?? string.Empty,
            scheduledAtRaw,
            currentInterval.ToString(),
            targetPriceId,
            prorationBillingMode,
            effectiveFrom);
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(hash);
    }
}
