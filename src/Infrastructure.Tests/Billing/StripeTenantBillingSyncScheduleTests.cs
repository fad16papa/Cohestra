using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class StripeTenantBillingSyncScheduleTests
{
    [Fact]
    public void ApplyScheduledPlan_DowngradeToBasic_SetsFree()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Pro,
            BillingStatus = BillingStatus.Active,
            ScheduledPlan = TenantPlan.Basic,
            ScheduledPlanEffectiveAt = DateTimeOffset.UtcNow.AddMinutes(-1),
        };

        StripeTenantBillingSync.ApplyScheduledPlan(tenant, TenantPlan.Basic);

        Assert.Equal(TenantPlan.Basic, tenant.Plan);
        Assert.Equal(BillingStatus.Free, tenant.BillingStatus);
        Assert.Null(tenant.ScheduledPlan);
    }
}
