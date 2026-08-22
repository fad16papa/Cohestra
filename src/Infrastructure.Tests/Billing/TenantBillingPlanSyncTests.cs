using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class TenantBillingPlanSyncTests
{
    [Fact]
    public void ApplyScheduledPlan_DowngradeToBasic_SetsFree()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Pro,
            BillingStatus = BillingStatus.Active,
            PaddleSubscriptionId = "sub_pro",
            ScheduledPlan = TenantPlan.Basic,
            ScheduledPlanEffectiveAt = DateTimeOffset.UtcNow.AddMinutes(-1),
        };

        TenantBillingPlanSync.ApplyScheduledPlan(tenant, TenantPlan.Basic);

        Assert.Equal(TenantPlan.Basic, tenant.Plan);
        Assert.Equal(BillingStatus.Free, tenant.BillingStatus);
        Assert.Null(tenant.ScheduledPlan);
        Assert.Null(tenant.ScheduledBillingInterval);
        Assert.Null(tenant.PaddleSubscriptionId);
        Assert.Null(tenant.PaddleSubscriptionScheduleId);
    }

    [Fact]
    public void ApplyScheduledPlan_PaidDowngrade_KeepsSubscriptionId()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Pro,
            BillingStatus = BillingStatus.Active,
            BillingInterval = BillingInterval.Annual,
            PaddleSubscriptionId = "sub_pro",
            PaddleSubscriptionScheduleId = "sch_123",
            ScheduledPlan = TenantPlan.Core,
            ScheduledBillingInterval = BillingInterval.Monthly,
        };

        TenantBillingPlanSync.ApplyScheduledPlan(tenant, TenantPlan.Core);

        Assert.Equal(TenantPlan.Core, tenant.Plan);
        Assert.Equal(BillingInterval.Monthly, tenant.BillingInterval);
        Assert.Equal("sub_pro", tenant.PaddleSubscriptionId);
        Assert.Null(tenant.PaddleSubscriptionScheduleId);
        Assert.Null(tenant.ScheduledPlan);
    }

    [Fact]
    public void ApplySubscriptionDeleted_ResetsToBasicFree()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Pro,
            BillingStatus = BillingStatus.Canceled,
            PaddleCustomerId = "ctm_123",
            PaddleSubscriptionId = "sub_123",
        };

        TenantBillingPlanSync.ApplySubscriptionDeleted(tenant);

        Assert.Equal(TenantPlan.Basic, tenant.Plan);
        Assert.Equal(BillingStatus.Free, tenant.BillingStatus);
        Assert.Null(tenant.PaddleSubscriptionId);
        Assert.Equal("ctm_123", tenant.PaddleCustomerId);
    }

    [Fact]
    public void IsPaidPlanDowngrade_OnlyDownTiers()
    {
        Assert.True(TenantBillingPlanSync.IsPaidPlanDowngrade(TenantPlan.Pro, TenantPlan.Core));
        Assert.False(TenantBillingPlanSync.IsPaidPlanDowngrade(TenantPlan.Core, TenantPlan.Pro));
    }

    [Fact]
    public void ShouldDeferPlanChange_DowngradeOrAnnualToMonthly()
    {
        Assert.True(TenantBillingPlanSync.ShouldDeferPlanChange(
            TenantPlan.Pro, BillingInterval.Monthly, TenantPlan.Core, BillingInterval.Monthly));
        Assert.True(TenantBillingPlanSync.ShouldDeferPlanChange(
            TenantPlan.Core, BillingInterval.Annual, TenantPlan.Core, BillingInterval.Monthly));
        Assert.False(TenantBillingPlanSync.ShouldDeferPlanChange(
            TenantPlan.Core, BillingInterval.Monthly, TenantPlan.Pro, BillingInterval.Monthly));
    }

    [Fact]
    public void TryMapPrice_MatchesConfiguredIds()
    {
        var settings = new PaddleSettings
        {
            PriceCoreMonthly = "pri_core_m",
            PriceCoreAnnual = "pri_core_a",
            PriceProMonthly = "pri_pro_m",
            PriceProAnnual = "pri_pro_a",
        };

        Assert.True(TenantBillingPlanSync.TryMapPrice(settings.PriceCoreMonthly, settings, out var corePlan, out var coreInterval));
        Assert.Equal(TenantPlan.Core, corePlan);
        Assert.Equal(BillingInterval.Monthly, coreInterval);
        Assert.True(TenantBillingPlanSync.TryMapPrice(settings.PriceProAnnual, settings, out var proPlan, out var proInterval));
        Assert.Equal(TenantPlan.Pro, proPlan);
        Assert.Equal(BillingInterval.Annual, proInterval);
        Assert.Equal("pri_core_m", TenantBillingPlanSync.ResolvePriceId(TenantPlan.Core, BillingInterval.Monthly, settings));
    }

    [Fact]
    public void BuildTrialDisclaimer_IncludesDate()
    {
        var disclaimer = TenantBillingPlanSync.BuildTrialDisclaimer(new DateTimeOffset(2026, 8, 21, 0, 0, 0, TimeSpan.Zero));
        Assert.Contains("August 21, 2026", disclaimer, StringComparison.Ordinal);
    }
}
