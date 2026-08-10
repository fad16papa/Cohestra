using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class TenantBillingAccessTests
{
    [Theory]
    [InlineData(TenantPlan.Pro, true)]
    [InlineData(TenantPlan.Core, true)]
    [InlineData(TenantPlan.Basic, false)]
    public void RequiresBillingOwner_is_true_for_paid_plans(TenantPlan plan, bool expected)
    {
        Assert.Equal(expected, TenantBillingAccess.RequiresBillingOwner(plan));
    }

    [Fact]
    public void IsBillingOwner_matches_admin_contact_email_case_insensitive()
    {
        var tenant = new Tenant
        {
            AdminContactEmail = "owner@cohestra.local",
        };

        Assert.True(TenantBillingAccess.IsBillingOwner(tenant, "owner@cohestra.local"));
        Assert.True(TenantBillingAccess.IsBillingOwner(tenant, "Owner@Cohestra.Local"));
        Assert.False(TenantBillingAccess.IsBillingOwner(tenant, "other@cohestra.local"));
    }

    [Fact]
    public void CanManageBilling_allows_any_tenant_admin_on_basic()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Basic,
            AdminContactEmail = "owner@cohestra.local",
        };

        Assert.True(TenantBillingAccess.CanManageBilling(tenant, "other@cohestra.local", isTenantAdmin: true));
    }

    [Fact]
    public void CanManageBilling_requires_owner_email_on_pro()
    {
        var tenant = new Tenant
        {
            Plan = TenantPlan.Pro,
            AdminContactEmail = "owner@cohestra.local",
        };

        Assert.True(TenantBillingAccess.CanManageBilling(tenant, "owner@cohestra.local", isTenantAdmin: true));
        Assert.False(TenantBillingAccess.CanManageBilling(tenant, "invited@cohestra.local", isTenantAdmin: true));
        Assert.False(TenantBillingAccess.CanManageBilling(tenant, "owner@cohestra.local", isTenantAdmin: false));
    }
}
