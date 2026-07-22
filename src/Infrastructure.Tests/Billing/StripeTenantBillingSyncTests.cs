using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;

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
    public void BuildTrialDisclaimer_IncludesTrialEndDate()
    {
        var disclaimer = StripeTenantBillingSync.BuildTrialDisclaimer(new DateTimeOffset(2026, 8, 21, 0, 0, 0, TimeSpan.Zero));
        Assert.Contains("August 21, 2026", disclaimer);
        Assert.Contains("not be charged", disclaimer, StringComparison.OrdinalIgnoreCase);
    }
}
