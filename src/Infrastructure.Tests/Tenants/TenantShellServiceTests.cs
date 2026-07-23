using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Tenants;

namespace Cohestra.Infrastructure.Tests.Tenants;

public sealed class TenantShellServiceTests
{
    [Fact]
    public void BuildLimitDials_WarnsAtEightyPercent()
    {
        var limits = TenantPlanLimits.For(TenantPlan.Basic);
        var usage = new Cohestra.Contracts.Admin.PlanUsageResponse(0, 0, 2, 121);

        var dials = TenantShellService.BuildLimitDials(limits, usage);
        var registrations = dials.Single(d => d.Key == "registrations");

        Assert.True(registrations.Warn);
        Assert.False(registrations.Blocked);
        Assert.Equal(81, registrations.Percent);
    }

    [Fact]
    public void BuildLimitDials_BlocksAtCapacity()
    {
        var limits = TenantPlanLimits.For(TenantPlan.Basic);
        var usage = new Cohestra.Contracts.Admin.PlanUsageResponse(0, 1, 3, 150);

        var dials = TenantShellService.BuildLimitDials(limits, usage);
        var published = dials.Single(d => d.Key == "published");
        var registrations = dials.Single(d => d.Key == "registrations");

        Assert.True(published.Blocked);
        Assert.True(registrations.Blocked);
    }

    [Fact]
    public void BuildBillingBanner_PastDue_IncludesAdminCta()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Core,
            BillingStatus = BillingStatus.PastDue,
        };

        var banner = TenantShellService.BuildBillingBanner(tenant, [], isTenantAdmin: true);

        Assert.NotNull(banner);
        Assert.Equal("past_due", banner!.Variant);
        Assert.Equal("Settle balance", banner.CtaLabel);
    }

    [Fact]
    public void BuildBillingBanner_Complimentary_IsHidden()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Pro,
            BillingStatus = BillingStatus.PastDue,
            IsComplimentary = true,
        };

        Assert.Null(TenantShellService.BuildBillingBanner(tenant, [], isTenantAdmin: true));
    }

    [Fact]
    public void BuildBillingBanner_TrialEndingSoon_ShowsForAdmin()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Core,
            BillingStatus = BillingStatus.Trialing,
            TrialEndsAt = DateTimeOffset.UtcNow.AddDays(3),
        };

        var banner = TenantShellService.BuildBillingBanner(tenant, [], isTenantAdmin: true);

        Assert.NotNull(banner);
        Assert.Equal("trialing", banner!.Variant);
    }

    [Fact]
    public void BuildBillingBanner_ExpiredTrial_DoesNotShowTrialingBanner()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Core,
            BillingStatus = BillingStatus.Trialing,
            TrialEndsAt = DateTimeOffset.UtcNow.AddDays(-1),
        };

        Assert.Null(TenantShellService.BuildBillingBanner(tenant, [], isTenantAdmin: true));
    }

    [Fact]
    public void BuildBillingBanner_PastDue_TakesPriorityOverOverLimit()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Basic,
            BillingStatus = BillingStatus.PastDue,
        };

        var blockedDial = new Cohestra.Contracts.Admin.LimitDialResponse(
            "published",
            "Published activities",
            3,
            3,
            100,
            Warn: false,
            Blocked: true);

        var banner = TenantShellService.BuildBillingBanner(tenant, [blockedDial], isTenantAdmin: true);

        Assert.NotNull(banner);
        Assert.Equal("past_due", banner!.Variant);
    }

    [Fact]
    public void BuildBillingBanner_OverLimit_SuggestsNextPlanUpgrade()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Basic,
            BillingStatus = BillingStatus.Active,
        };

        var blockedDial = new Cohestra.Contracts.Admin.LimitDialResponse(
            "communities",
            "Communities",
            1,
            1,
            100,
            Warn: false,
            Blocked: true);

        var banner = TenantShellService.BuildBillingBanner(tenant, [blockedDial], isTenantAdmin: true);

        Assert.NotNull(banner);
        Assert.Equal("read_only_over_limit", banner!.Variant);
        Assert.Equal("/billing/checkout?plan=core&interval=monthly", banner.CtaHref);
    }

    [Fact]
    public void BuildBillingBanner_OverLimitOnPro_HidesUpgradeCta()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Pro,
            BillingStatus = BillingStatus.Active,
        };

        var blockedDial = new Cohestra.Contracts.Admin.LimitDialResponse(
            "published",
            "Published activities",
            50,
            50,
            100,
            Warn: false,
            Blocked: true);

        var banner = TenantShellService.BuildBillingBanner(tenant, [blockedDial], isTenantAdmin: true);

        Assert.NotNull(banner);
        Assert.Null(banner!.CtaHref);
    }
}
