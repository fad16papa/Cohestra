using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleSubscriptionChangeSchedulerTests
{
    [Fact]
    public void HasActiveScheduledPaidDowngrade_requires_future_paid_plan_and_marker()
    {
        var tenant = new Tenant
        {
            ScheduledPlan = TenantPlan.Core,
            ScheduledPlanEffectiveAt = DateTimeOffset.UtcNow.AddDays(3),
            PaddleSubscriptionScheduleId = "sch:sub:pri",
        };

        Assert.True(PaddleSubscriptionChangeScheduler.HasActiveScheduledPaidDowngrade(tenant));

        tenant.ScheduledPlan = TenantPlan.Basic;
        Assert.False(PaddleSubscriptionChangeScheduler.HasActiveScheduledPaidDowngrade(tenant));
    }

    [Fact]
    public void ShouldReleaseScheduleBeforeCancelAtPeriodEnd_only_when_canceling_with_marker()
    {
        Assert.True(PaddleSubscriptionChangeScheduler.ShouldReleaseScheduleBeforeCancelAtPeriodEnd(true, "sch:1"));
        Assert.False(PaddleSubscriptionChangeScheduler.ShouldReleaseScheduleBeforeCancelAtPeriodEnd(true, null));
        Assert.False(PaddleSubscriptionChangeScheduler.ShouldReleaseScheduleBeforeCancelAtPeriodEnd(false, "sch:1"));
    }
}
