using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class BillingNotificationComposerTests
{
    [Theory]
    [InlineData(7, 7)]
    [InlineData(1, 1)]
    [InlineData(0, null)]
    [InlineData(14, null)]
    [InlineData(3, null)]
    public void ResolveScheduledDowngradeReminderDays_matches_7_and_1_day_windows(
        int daysUntilEffective,
        int? expected)
    {
        var now = new DateTimeOffset(2026, 8, 1, 12, 0, 0, TimeSpan.Zero);
        var effectiveAt = now.AddDays(daysUntilEffective);

        var result = BillingNotificationComposer.ResolveScheduledDowngradeReminderDays(now, effectiveAt);

        Assert.Equal(expected, result);
    }

    [Fact]
    public void HasScheduledPaidDowngrade_true_for_future_core_schedule()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Pro,
            ScheduledPlan = TenantPlan.Core,
            ScheduledPlanEffectiveAt = DateTimeOffset.UtcNow.AddDays(14),
        };

        Assert.True(BillingNotificationComposer.HasScheduledPaidDowngrade(tenant));
    }

    [Fact]
    public void HasScheduledPaidDowngrade_false_for_basic_schedule()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Pro,
            ScheduledPlan = TenantPlan.Basic,
            ScheduledPlanEffectiveAt = DateTimeOffset.UtcNow.AddDays(14),
        };

        Assert.False(BillingNotificationComposer.HasScheduledPaidDowngrade(tenant));
    }
}
