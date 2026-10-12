using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Billing;

/// <summary>
/// Chooses Paddle subscription-update parameters from live status and
/// plan/interval transition. Frequency changes cannot use
/// <c>prorated_next_billing_period</c>. Trials must use <c>do_not_bill</c>.
/// </summary>
internal static class PaddleSubscriptionChangePolicy
{
    public const string Immediately = "immediately";
    public const string NextBillingPeriod = "next_billing_period";
    public const string DoNotBill = "do_not_bill";
    public const string ProratedImmediately = "prorated_immediately";
    public const string ProratedNextBillingPeriod = "prorated_next_billing_period";

    public const string PastDueMessage =
        "This subscription is past due. Update the payment method in Settings → Billing before changing plans.";

    public const string UnsupportedItemsMessage =
        "This subscription has extra items that cannot be changed in-app. Open Settings → Billing to manage it.";

    public const string NoBillableItemsMessage =
        "This subscription has no billable items. Open Settings → Billing and try again.";

    public const string UnknownIntervalMessage =
        "Could not determine your current billing interval. Open Settings → Billing and try again.";

    public const string RestrictedStatusMessage =
        "This subscription cannot be changed in its current state. Open Settings → Billing and try again.";

    public const string ScheduledChangeMessage =
        "A plan change is already scheduled. Undo it on the checkout page or in Settings → Billing before choosing a different plan.";

    public const string ScheduledCancelMessage =
        "This subscription is scheduled to cancel. Resume it in Settings → Billing before changing plans.";

    public const string PartialCancelClearMessage =
        "Your pending cancellation was removed, but the plan change could not be scheduled. Try again, or schedule cancellation again from Settings → Billing.";

    public const string MissingPeriodEndMessage =
        "Could not determine when your current billing period ends. Open Settings → Billing and try again.";

    public sealed record ImmediateUpdate(
        string EffectiveFrom,
        string ProrationBillingMode,
        string Disclaimer);

    public static bool IsFrequencyChange(BillingInterval? current, BillingInterval target) =>
        current is { } value && value != target;

    public static string? CurrentPriceId(PaddleSubscription subscription) =>
        subscription.Items.FirstOrDefault()?.Price?.Id
        ?? subscription.Items.FirstOrDefault()?.PriceId;

    public static IReadOnlyList<PaddleSubscriptionItem> RecurringItems(PaddleSubscription subscription) =>
        subscription.Items
            .Where(item =>
                !string.IsNullOrWhiteSpace(item.Price?.Id) || !string.IsNullOrWhiteSpace(item.PriceId))
            .ToList();

    public static int RecurringItemCount(PaddleSubscription subscription) =>
        RecurringItems(subscription).Count;

    public static bool IsTrialing(PaddleSubscription subscription, BillingStatus tenantStatus)
    {
        if (string.Equals(subscription.Status, "trialing", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (string.Equals(subscription.Status, "active", StringComparison.OrdinalIgnoreCase)
            && subscription.TrialDates?.EndsAt is { } trialEnd
            && trialEnd > DateTimeOffset.UtcNow)
        {
            return true;
        }

        return string.IsNullOrWhiteSpace(subscription.Status)
            && tenantStatus == BillingStatus.Trialing;
    }

    public static bool IsPastDue(PaddleSubscription subscription, BillingStatus tenantStatus) =>
        string.Equals(subscription.Status, "past_due", StringComparison.OrdinalIgnoreCase)
        || tenantStatus == BillingStatus.PastDue;

    public static bool IsRestrictedStatus(PaddleSubscription subscription) =>
        subscription.Status.Equals("paused", StringComparison.OrdinalIgnoreCase)
        || subscription.Status.Equals("canceled", StringComparison.OrdinalIgnoreCase)
        || subscription.Status.Equals("cancelled", StringComparison.OrdinalIgnoreCase);

    public static ImmediateUpdate ResolveImmediateUpdate(
        PaddleSubscription subscription,
        BillingStatus tenantStatus,
        BillingInterval? currentInterval,
        BillingInterval targetInterval)
    {
        if (IsTrialing(subscription, tenantStatus))
        {
            return new ImmediateUpdate(
                Immediately,
                DoNotBill,
                TenantBillingPlanSync.BuildTrialDisclaimer(
                    subscription.TrialDates?.EndsAt
                    ?? subscription.NextBilledAt
                    ?? DateTimeOffset.UtcNow.AddDays(30)));
        }

        if (IsFrequencyChange(currentInterval, targetInterval))
        {
            return new ImmediateUpdate(
                Immediately,
                ProratedImmediately,
                targetInterval == BillingInterval.Annual
                    ? "Yearly billing starts now. Unused time on your current period is applied as credit against the new price. Your next renewal is one year from today."
                    : "Monthly billing starts now. Unused time on your current period is applied as credit against the new price.");
        }

        return new ImmediateUpdate(
            Immediately,
            ProratedNextBillingPeriod,
            "Your plan was updated. Any price difference is prorated on your next invoice.");
    }

    /// <summary>
    /// Shared fail-closed gate for immediate and deferred item updates.
    /// Pending cancellation may be cleared only on the authorized deferred
    /// downgrade path (billing-b2); every other unsafe state rejects before
    /// any Paddle mutation.
    /// </summary>
    public static string? RejectBeforeMutation(
        PaddleSubscription subscription,
        BillingStatus tenantStatus,
        bool allowPendingCancel)
    {
        if (IsPastDue(subscription, tenantStatus))
        {
            return PastDueMessage;
        }

        if (IsRestrictedStatus(subscription))
        {
            return RestrictedStatusMessage;
        }

        var items = RecurringItems(subscription);
        if (items.Count == 0)
        {
            return NoBillableItemsMessage;
        }

        if (items.Count != 1 || items[0].Quantity != 1)
        {
            return UnsupportedItemsMessage;
        }

        if (subscription.ScheduledChange is { Action.Length: > 0 })
        {
            if (string.Equals(subscription.ScheduledChange.Action, "cancel", StringComparison.OrdinalIgnoreCase))
            {
                return allowPendingCancel ? null : ScheduledCancelMessage;
            }

            return ScheduledChangeMessage;
        }

        return null;
    }

    public static string? RejectImmediateUpdate(
        PaddleSubscription subscription,
        BillingStatus tenantStatus) =>
        RejectBeforeMutation(subscription, tenantStatus, allowPendingCancel: false);

    public static string MapProviderFailure(PaddleApiException ex)
    {
        if (ex.StatusCode == 429)
        {
            return "Billing is busy. Wait a moment and try again.";
        }

        if (ex.StatusCode is >= 500 and <= 599)
        {
            return "Paddle is temporarily unavailable. Try again shortly.";
        }

        if (ex.StatusCode == 409)
        {
            return "This subscription cannot be changed right now. Open Settings → Billing and try again.";
        }

        if (string.Equals(ex.ErrorCode, "subscription_payment_failed", StringComparison.OrdinalIgnoreCase))
        {
            return PastDueMessage;
        }

        return "Could not update your subscription. Open Settings → Billing and try again.";
    }
}
