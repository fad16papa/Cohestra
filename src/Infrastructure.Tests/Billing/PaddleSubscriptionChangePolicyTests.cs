using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleSubscriptionChangePolicyTests
{
    [Fact]
    public void Trialing_frequency_or_plan_change_uses_do_not_bill()
    {
        var subscription = new PaddleSubscription { Status = "trialing" };
        var update = PaddleSubscriptionChangePolicy.ResolveImmediateUpdate(
            subscription,
            BillingStatus.Trialing,
            BillingInterval.Monthly,
            BillingInterval.Annual);

        Assert.Equal(PaddleSubscriptionChangePolicy.Immediately, update.EffectiveFrom);
        Assert.Equal(PaddleSubscriptionChangePolicy.DoNotBill, update.ProrationBillingMode);
        Assert.Contains("will not be charged", update.Disclaimer, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Active_status_with_open_trial_dates_uses_do_not_bill()
    {
        var subscription = new PaddleSubscription
        {
            Status = "active",
            TrialDates = new PaddleTimePeriod { EndsAt = DateTimeOffset.UtcNow.AddDays(12) },
        };

        var update = PaddleSubscriptionChangePolicy.ResolveImmediateUpdate(
            subscription,
            BillingStatus.Active,
            BillingInterval.Monthly,
            BillingInterval.Annual);

        Assert.Equal(PaddleSubscriptionChangePolicy.DoNotBill, update.ProrationBillingMode);
    }

    [Fact]
    public void Stale_tenant_trial_does_not_override_live_active_subscription()
    {
        var update = PaddleSubscriptionChangePolicy.ResolveImmediateUpdate(
            new PaddleSubscription { Status = "active" },
            BillingStatus.Trialing,
            BillingInterval.Monthly,
            BillingInterval.Annual);

        Assert.Equal(PaddleSubscriptionChangePolicy.ProratedImmediately, update.ProrationBillingMode);
    }

    [Fact]
    public void Active_frequency_change_uses_prorated_immediately()
    {
        var subscription = new PaddleSubscription { Status = "active" };
        var update = PaddleSubscriptionChangePolicy.ResolveImmediateUpdate(
            subscription,
            BillingStatus.Active,
            BillingInterval.Monthly,
            BillingInterval.Annual);

        Assert.Equal(PaddleSubscriptionChangePolicy.ProratedImmediately, update.ProrationBillingMode);
        Assert.Contains("Yearly billing starts now", update.Disclaimer, StringComparison.Ordinal);
    }

    [Fact]
    public void Active_same_frequency_upgrade_keeps_next_period_proration()
    {
        var subscription = new PaddleSubscription { Status = "active" };
        var update = PaddleSubscriptionChangePolicy.ResolveImmediateUpdate(
            subscription,
            BillingStatus.Active,
            BillingInterval.Monthly,
            BillingInterval.Monthly);

        Assert.Equal(PaddleSubscriptionChangePolicy.ProratedNextBillingPeriod, update.ProrationBillingMode);
    }

    [Fact]
    public void Rejects_past_due_paused_scheduled_and_multi_item()
    {
        Assert.Equal(
            PaddleSubscriptionChangePolicy.PastDueMessage,
            PaddleSubscriptionChangePolicy.RejectImmediateUpdate(
                new PaddleSubscription { Status = "past_due", Items = OneItem() },
                BillingStatus.Active));
        Assert.Equal(
            PaddleSubscriptionChangePolicy.RestrictedStatusMessage,
            PaddleSubscriptionChangePolicy.RejectImmediateUpdate(
                new PaddleSubscription { Status = "paused", Items = OneItem() },
                BillingStatus.Active));
        Assert.Equal(
            PaddleSubscriptionChangePolicy.ScheduledChangeMessage,
            PaddleSubscriptionChangePolicy.RejectImmediateUpdate(
                new PaddleSubscription
                {
                    Status = "active",
                    Items = OneItem(),
                    ScheduledChange = new PaddleScheduledChange { Action = "update" },
                },
                BillingStatus.Active));
        Assert.Equal(
            PaddleSubscriptionChangePolicy.ScheduledCancelMessage,
            PaddleSubscriptionChangePolicy.RejectImmediateUpdate(
                new PaddleSubscription
                {
                    Status = "active",
                    Items = OneItem(),
                    ScheduledChange = new PaddleScheduledChange { Action = "cancel" },
                },
                BillingStatus.Active));
        Assert.Equal(
            PaddleSubscriptionChangePolicy.UnsupportedItemsMessage,
            PaddleSubscriptionChangePolicy.RejectImmediateUpdate(
                new PaddleSubscription
                {
                    Status = "active",
                    Items = [new PaddleSubscriptionItem { Quantity = 3, Price = new PaddlePrice { Id = "pri_a" } }],
                },
                BillingStatus.Active));
        Assert.Equal(
            PaddleSubscriptionChangePolicy.UnsupportedItemsMessage,
            PaddleSubscriptionChangePolicy.RejectImmediateUpdate(
                new PaddleSubscription
                {
                    Status = "active",
                    Items =
                    [
                        new PaddleSubscriptionItem { Price = new PaddlePrice { Id = "pri_a" } },
                        new PaddleSubscriptionItem { Price = new PaddlePrice { Id = "pri_b" } },
                    ],
                },
                BillingStatus.Active));
        Assert.Equal(
            PaddleSubscriptionChangePolicy.NoBillableItemsMessage,
            PaddleSubscriptionChangePolicy.RejectImmediateUpdate(
                new PaddleSubscription { Status = "active", Items = [] },
                BillingStatus.Active));
        Assert.Null(
            PaddleSubscriptionChangePolicy.RejectImmediateUpdate(
                new PaddleSubscription { Status = "active", Items = OneItem() },
                BillingStatus.Active));
    }

    [Theory]
    [InlineData(429, null, "Billing is busy")]
    [InlineData(503, null, "temporarily unavailable")]
    [InlineData(409, null, "cannot be changed right now")]
    [InlineData(400, "subscription_payment_failed", "past due")]
    [InlineData(400, "subscription_update_unsuccessful", "Could not update your subscription")]
    public void MapProviderFailure_classifies_safe_messages(int status, string? code, string expected)
    {
        var message = PaddleSubscriptionChangePolicy.MapProviderFailure(
            new PaddleApiException("internal paddle detail", status, code));
        Assert.Contains(expected, message, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("internal paddle detail", message, StringComparison.Ordinal);
    }

    private static List<PaddleSubscriptionItem> OneItem() =>
        [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_pro_m" } }];
}
