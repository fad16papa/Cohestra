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
        var usage = new Cohestra.Contracts.Admin.PlanUsageResponse(0, 2, 121);

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
        var usage = new Cohestra.Contracts.Admin.PlanUsageResponse(1, 3, 150);

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
}
