using System.Text.Json;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleTenantBillingSyncTests
{
    [Fact]
    public void ApplySubscription_trialing_unlocks_core_and_consumes_trial()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Basic,
            BillingStatus = BillingStatus.Free,
        };
        var settings = PaddleBillingTestHarness.DefaultSettings();
        var subscription = new PaddleSubscription
        {
            Id = "sub_1",
            CustomerId = "ctm_1",
            Status = "trialing",
            Items = [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_core_m" } }],
            TrialDates = new PaddleTimePeriod
            {
                StartsAt = DateTimeOffset.UtcNow,
                EndsAt = DateTimeOffset.UtcNow.AddDays(30),
            },
        };

        PaddleTenantBillingSync.ApplySubscription(tenant, subscription, settings);

        Assert.Equal(TenantPlan.Core, tenant.Plan);
        Assert.Equal(BillingStatus.Trialing, tenant.BillingStatus);
        Assert.Equal(BillingInterval.Monthly, tenant.BillingInterval);
        Assert.True(tenant.HasConsumedTrial);
        Assert.Equal("sub_1", tenant.PaddleSubscriptionId);
    }

    [Fact]
    public void ApplySubscription_cancel_at_period_end_keeps_current_plan()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Pro,
            BillingStatus = BillingStatus.Active,
            BillingInterval = BillingInterval.Monthly,
        };
        var periodEnd = DateTimeOffset.UtcNow.AddDays(12);
        var subscription = new PaddleSubscription
        {
            Id = "sub_1",
            CustomerId = "ctm_1",
            Status = "active",
            Items = [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_pro_m" } }],
            CurrentBillingPeriod = new PaddleTimePeriod
            {
                StartsAt = DateTimeOffset.UtcNow,
                EndsAt = periodEnd,
            },
            ScheduledChange = new PaddleScheduledChange { Action = "cancel", EffectiveAt = periodEnd },
        };

        PaddleTenantBillingSync.ApplySubscription(tenant, subscription, PaddleBillingTestHarness.DefaultSettings());

        Assert.Equal(TenantPlan.Pro, tenant.Plan);
        Assert.Equal(TenantPlan.Basic, tenant.ScheduledPlan);
        Assert.Equal(periodEnd, tenant.ScheduledPlanEffectiveAt);
    }

    [Fact]
    public void ApplySubscription_preserves_local_paid_downgrade_schedule()
    {
        var effective = DateTimeOffset.UtcNow.AddDays(8);
        var tenant = new Tenant
        {
            Plan = TenantPlan.Pro,
            BillingStatus = BillingStatus.Active,
            BillingInterval = BillingInterval.Annual,
            ScheduledPlan = TenantPlan.Core,
            ScheduledPlanEffectiveAt = effective,
            ScheduledBillingInterval = BillingInterval.Monthly,
            PaddleSubscriptionScheduleId = "sch:sub_1:pri_core_m",
        };
        var subscription = new PaddleSubscription
        {
            Id = "sub_1",
            CustomerId = "ctm_1",
            Status = "active",
            Items = [new PaddleSubscriptionItem { Quantity = 1, Price = new PaddlePrice { Id = "pri_pro_a" } }],
            CurrentBillingPeriod = new PaddleTimePeriod
            {
                StartsAt = DateTimeOffset.UtcNow,
                EndsAt = effective,
            },
        };

        PaddleTenantBillingSync.ApplySubscription(tenant, subscription, PaddleBillingTestHarness.DefaultSettings());

        Assert.Equal(TenantPlan.Pro, tenant.Plan);
        Assert.Equal(TenantPlan.Core, tenant.ScheduledPlan);
        Assert.Equal("sch:sub_1:pri_core_m", tenant.PaddleSubscriptionScheduleId);
    }

    [Fact]
    public void TryMapPlanFromCustomData_reads_plan_and_interval()
    {
        using var doc = JsonDocument.Parse("""{"plan":"Pro","interval":"annual","tenant_id":"11111111-1111-1111-1111-111111111111"}""");

        var mapped = PaddleTenantBillingSync.TryMapPlanFromCustomData(
            doc.RootElement.Clone(),
            out var plan,
            out var interval);

        Assert.True(mapped);
        Assert.Equal(TenantPlan.Pro, plan);
        Assert.Equal(BillingInterval.Annual, interval);
    }
}
