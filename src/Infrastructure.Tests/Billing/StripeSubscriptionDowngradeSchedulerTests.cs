using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;
using Stripe;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class StripeSubscriptionDowngradeSchedulerTests
{
    [Fact]
    public void ShouldReleaseScheduleBeforeCancelAtPeriodEnd_trueWhenCancelingWithSchedule()
    {
        Assert.True(
            StripeSubscriptionDowngradeScheduler.ShouldReleaseScheduleBeforeCancelAtPeriodEnd(
                cancelAtPeriodEnd: true,
                scheduleId: "sub_sched_123"));
    }

    [Fact]
    public void ShouldReleaseScheduleBeforeCancelAtPeriodEnd_falseWhenResuming()
    {
        Assert.False(
            StripeSubscriptionDowngradeScheduler.ShouldReleaseScheduleBeforeCancelAtPeriodEnd(
                cancelAtPeriodEnd: false,
                scheduleId: "sub_sched_123"));
    }

    [Fact]
    public void ResolveScheduleId_prefersSubscriptionScheduleId()
    {
        var tenant = new Tenant { StripeSubscriptionScheduleId = "sub_sched_tenant" };
        var subscription = new Subscription { ScheduleId = "sub_sched_sub" };

        Assert.Equal(
            "sub_sched_sub",
            StripeSubscriptionDowngradeScheduler.ResolveScheduleId(tenant, subscription));
    }

    [Fact]
    public void ResolveScheduleId_fallsBackToTenantScheduleIdWhenSubscriptionHasNone()
    {
        var tenant = new Tenant { StripeSubscriptionScheduleId = "sub_sched_tenant" };
        var subscription = new Subscription();

        Assert.Equal(
            "sub_sched_tenant",
            StripeSubscriptionDowngradeScheduler.ResolveScheduleId(tenant, subscription));
    }

    [Fact]
    public void ResolveScheduleId_fallsBackToSubscriptionScheduleId()
    {
        var tenant = new Tenant();
        var subscription = new Subscription { ScheduleId = "sub_sched_sub" };

        Assert.Equal(
            "sub_sched_sub",
            StripeSubscriptionDowngradeScheduler.ResolveScheduleId(tenant, subscription));
    }
}
