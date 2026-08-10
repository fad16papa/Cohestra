using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;
using Stripe;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class StripeTenantBillingSyncTests
{
    private static StripeSettings CreateSettings() =>
        new()
        {
            PriceCoreMonthly = "price_core_monthly",
            PriceCoreAnnual = "price_core_annual",
            PriceProMonthly = "price_pro_monthly",
            PriceProAnnual = "price_pro_annual",
        };

    [Theory]
    [InlineData("trialing", BillingStatus.Trialing)]
    [InlineData("active", BillingStatus.Active)]
    [InlineData("past_due", BillingStatus.PastDue)]
    [InlineData("unpaid", BillingStatus.OnHold)]
    [InlineData("canceled", BillingStatus.Canceled)]
    public void MapSubscriptionStatus_MapsKnownValues(string stripeStatus, BillingStatus expected)
    {
        Assert.Equal(expected, StripeTenantBillingSync.MapSubscriptionStatus(stripeStatus));
    }

    [Fact]
    public void IsPaidPlanDowngrade_DetectsProToCore()
    {
        Assert.True(StripeTenantBillingSync.IsPaidPlanDowngrade(TenantPlan.Pro, TenantPlan.Core));
        Assert.False(StripeTenantBillingSync.IsPaidPlanDowngrade(TenantPlan.Core, TenantPlan.Pro));
    }

    [Fact]
    public void TryMapPrice_ResolvesCoreAndProPrices()
    {
        var settings = CreateSettings();

        Assert.True(StripeTenantBillingSync.TryMapPrice(settings.PriceCoreMonthly, settings, out var corePlan, out var coreInterval));
        Assert.Equal(TenantPlan.Core, corePlan);
        Assert.Equal(BillingInterval.Monthly, coreInterval);

        Assert.True(StripeTenantBillingSync.TryMapPrice(settings.PriceProAnnual, settings, out var proPlan, out var proInterval));
        Assert.Equal(TenantPlan.Pro, proPlan);
        Assert.Equal(BillingInterval.Annual, proInterval);
    }

    [Fact]
    public void ApplySubscriptionDeleted_RevertsTenantToBasicFree()
    {
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = "acme",
            Name = "Acme",
            Plan = TenantPlan.Pro,
            BillingStatus = BillingStatus.Active,
            StripeCustomerId = "cus_123",
            StripeSubscriptionId = "sub_123",
            BillingInterval = BillingInterval.Monthly,
        };

        StripeTenantBillingSync.ApplySubscriptionDeleted(tenant);

        Assert.Equal(TenantPlan.Basic, tenant.Plan);
        Assert.Equal(BillingStatus.Free, tenant.BillingStatus);
        Assert.Null(tenant.StripeSubscriptionId);
        Assert.Equal("cus_123", tenant.StripeCustomerId);
    }

    [Theory]
    [InlineData("incomplete", BillingStatus.Free)]
    [InlineData("incomplete_expired", BillingStatus.Canceled)]
    [InlineData("unknown_status", BillingStatus.Canceled)]
    public void MapSubscriptionStatus_MapsNonActiveUnknownStatusesSafely(string stripeStatus, BillingStatus expected)
    {
        Assert.Equal(expected, StripeTenantBillingSync.MapSubscriptionStatus(stripeStatus));
    }

    [Fact]
    public void TryMapPlanFromMetadata_ResolvesCoreAndPro()
    {
        Assert.True(StripeTenantBillingSync.TryMapPlanFromMetadata(
            new Dictionary<string, string> { ["plan"] = "Pro", ["interval"] = "monthly" },
            out var plan,
            out var interval));
        Assert.Equal(TenantPlan.Pro, plan);
        Assert.Equal(BillingInterval.Monthly, interval);
    }

    [Fact]
    public void BuildTrialDisclaimer_IncludesTrialEndDate()
    {
        var disclaimer = StripeTenantBillingSync.BuildTrialDisclaimer(new DateTimeOffset(2026, 8, 21, 0, 0, 0, TimeSpan.Zero));
        Assert.Contains("August 21, 2026", disclaimer);
        Assert.Contains("not be charged", disclaimer, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ApplySubscription_Incomplete_DoesNotGrantPaidPlan()
    {
        var settings = CreateSettings();
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = "basic-shop",
            Name = "Basic Shop",
            Plan = TenantPlan.Basic,
            BillingStatus = BillingStatus.Free,
        };

        var subscription = new Subscription
        {
            Id = "sub_incomplete",
            CustomerId = "cus_incomplete",
            Status = "incomplete",
            Metadata = new Dictionary<string, string>
            {
                ["plan"] = "Pro",
                ["interval"] = "monthly",
            },
            Items = new StripeList<SubscriptionItem>
            {
                Data =
                [
                    new SubscriptionItem
                    {
                        Price = new Price { Id = settings.PriceProMonthly },
                    },
                ],
            },
        };

        StripeTenantBillingSync.ApplySubscription(tenant, subscription, settings);

        Assert.Equal(TenantPlan.Basic, tenant.Plan);
        Assert.Equal(BillingStatus.Free, tenant.BillingStatus);
        Assert.Null(tenant.StripeSubscriptionId);
        Assert.Equal("cus_incomplete", tenant.StripeCustomerId);
    }

    [Fact]
    public void ApplySubscription_Incomplete_ClearsFalsePaidPlanBadge()
    {
        var settings = CreateSettings();
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = "false-pro",
            Name = "False Pro",
            Plan = TenantPlan.Pro,
            BillingStatus = BillingStatus.Free,
            BillingInterval = BillingInterval.Monthly,
        };

        var subscription = new Subscription
        {
            Id = "sub_incomplete_false_pro",
            CustomerId = "cus_false_pro",
            Status = "incomplete",
            Items = new StripeList<SubscriptionItem>
            {
                Data =
                [
                    new SubscriptionItem
                    {
                        Price = new Price { Id = settings.PriceProMonthly },
                    },
                ],
            },
        };

        StripeTenantBillingSync.ApplySubscription(tenant, subscription, settings);

        Assert.Equal(TenantPlan.Basic, tenant.Plan);
        Assert.Equal(BillingStatus.Free, tenant.BillingStatus);
        Assert.Null(tenant.BillingInterval);
        Assert.Null(tenant.StripeSubscriptionId);
    }

    [Fact]
    public void ApplySubscription_Trialing_GrantsMappedPlan()
    {
        var settings = CreateSettings();
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = "trial-shop",
            Name = "Trial Shop",
            Plan = TenantPlan.Basic,
            BillingStatus = BillingStatus.Free,
        };

        var subscription = new Subscription
        {
            Id = "sub_trialing",
            CustomerId = "cus_trialing",
            Status = "trialing",
            TrialEnd = DateTime.UtcNow.AddDays(30),
            Items = new StripeList<SubscriptionItem>
            {
                Data =
                [
                    new SubscriptionItem
                    {
                        Price = new Price { Id = settings.PriceProMonthly },
                    },
                ],
            },
        };

        StripeTenantBillingSync.ApplySubscription(tenant, subscription, settings);

        Assert.Equal(TenantPlan.Pro, tenant.Plan);
        Assert.Equal(BillingStatus.Trialing, tenant.BillingStatus);
        Assert.True(tenant.HasConsumedTrial);
    }

    [Fact]
    public void ApplySubscription_Downgrade_SchedulesPlanAtPeriodEnd()
    {
        var settings = CreateSettings();
        var periodEnd = DateTimeOffset.UtcNow.AddDays(14);
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = "pro-shop",
            Name = "Pro Shop",
            Plan = TenantPlan.Pro,
            BillingStatus = BillingStatus.Trialing,
            BillingInterval = BillingInterval.Monthly,
            StripeSubscriptionId = "sub_pro",
        };

        var subscription = new Subscription
        {
            Id = "sub_pro",
            CustomerId = "cus_pro",
            Status = "trialing",
            TrialEnd = DateTime.UtcNow.AddDays(14),
            Items = new StripeList<SubscriptionItem>
            {
                Data =
                [
                    new SubscriptionItem
                    {
                        CurrentPeriodEnd = periodEnd.UtcDateTime,
                        Price = new Price { Id = settings.PriceCoreMonthly },
                    },
                ],
            },
        };

        StripeTenantBillingSync.ApplySubscription(tenant, subscription, settings);

        Assert.Equal(TenantPlan.Pro, tenant.Plan);
        Assert.Equal(TenantPlan.Core, tenant.ScheduledPlan);
        Assert.Equal(periodEnd, tenant.ScheduledPlanEffectiveAt);
    }

    [Fact]
    public void ApplySubscription_RevertScheduledDowngrade_ClearsSchedule()
    {
        var settings = CreateSettings();
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = "pro-shop",
            Name = "Pro Shop",
            Plan = TenantPlan.Pro,
            BillingStatus = BillingStatus.Trialing,
            BillingInterval = BillingInterval.Monthly,
            ScheduledPlan = TenantPlan.Core,
            ScheduledPlanEffectiveAt = DateTimeOffset.UtcNow.AddDays(14),
        };

        var subscription = new Subscription
        {
            Id = "sub_pro",
            CustomerId = "cus_pro",
            Status = "trialing",
            Items = new StripeList<SubscriptionItem>
            {
                Data =
                [
                    new SubscriptionItem
                    {
                        Price = new Price { Id = settings.PriceProMonthly },
                    },
                ],
            },
        };

        StripeTenantBillingSync.ApplySubscription(tenant, subscription, settings);

        Assert.Equal(TenantPlan.Pro, tenant.Plan);
        Assert.Null(tenant.ScheduledPlan);
        Assert.Null(tenant.ScheduledPlanEffectiveAt);
    }

    [Theory]
    [InlineData("trialing", true)]
    [InlineData("active", true)]
    [InlineData("past_due", true)]
    [InlineData("incomplete", false)]
    [InlineData("canceled", false)]
    public void CanApplyPlanEntitlement_OnlyPaidLifecycleStatuses(string status, bool expected)
    {
        Assert.Equal(expected, StripeTenantBillingSync.CanApplyPlanEntitlement(status));
    }
}
