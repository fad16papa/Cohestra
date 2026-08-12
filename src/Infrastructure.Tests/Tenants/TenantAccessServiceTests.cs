using Cohestra.Application.Tenants;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Tenants;

namespace Cohestra.Infrastructure.Tests.Tenants;

public sealed class TenantAccessServiceTests
{
    [Fact]
    public void IsOverPlanLimits_DetectsSeatAndResourceOverflow()
    {
        var limits = TenantPlanLimits.For(TenantPlan.Basic);
        var usage = new TenantUsageSnapshot(
            limits.Seats + 1,
            limits.Communities,
            limits.PublishedActivities,
            limits.RegistrationsPerMonth);

        Assert.True(TenantAccessService.IsOverPlanLimits(TenantPlan.Basic, usage));
    }

    [Fact]
    public void IsOverAdminRecoverableLimits_BlocksAtCapForResources()
    {
        var limits = TenantPlanLimits.For(TenantPlan.Core);
        var usage = new TenantUsageSnapshot(
            limits.Seats,
            limits.Communities,
            limits.PublishedActivities,
            0);

        Assert.True(TenantAccessService.IsOverAdminRecoverableLimits(TenantPlan.Core, usage));
    }

    [Fact]
    public void IsOverRegistrationLimit_DoesNotTriggerAdminRecoverableLock()
    {
        var limits = TenantPlanLimits.For(TenantPlan.Pro);
        var usage = new TenantUsageSnapshot(
            limits.Seats,
            0,
            0,
            limits.RegistrationsPerMonth);

        Assert.False(TenantAccessService.IsOverAdminRecoverableLimits(TenantPlan.Pro, usage));
        Assert.True(TenantAccessService.IsOverRegistrationLimit(TenantPlan.Pro, usage));
        Assert.True(TenantAccessService.IsOverAnyPlanLimit(TenantPlan.Pro, usage));
    }

    [Fact]
    public void IsOverPlanLimits_BlocksAtCapForResources()
    {
        var limits = TenantPlanLimits.For(TenantPlan.Core);
        var usage = new TenantUsageSnapshot(
            limits.Seats,
            limits.Communities,
            limits.PublishedActivities,
            limits.RegistrationsPerMonth);

        Assert.True(TenantAccessService.IsOverPlanLimits(TenantPlan.Core, usage));
    }

    [Fact]
    public void IsOverPlanLimits_AllowsSeatsAtCapacity()
    {
        var limits = TenantPlanLimits.For(TenantPlan.Core);
        var usage = new TenantUsageSnapshot(
            limits.Seats,
            0,
            0,
            0);

        Assert.False(TenantAccessService.IsOverPlanLimits(TenantPlan.Core, usage));
    }
}
