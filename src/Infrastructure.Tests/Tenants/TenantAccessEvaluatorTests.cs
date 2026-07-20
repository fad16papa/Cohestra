using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Tests.Tenants;

public sealed class TenantAccessEvaluatorTests
{
    [Fact]
    public void New_Tenant_Defaults_To_Active_Basic_Free()
    {
        var tenant = new Tenant();

        Assert.Equal(TenantStatus.Active, tenant.Status);
        Assert.Equal(TenantPlan.Basic, tenant.Plan);
        Assert.Equal(BillingStatus.Free, tenant.BillingStatus);
        Assert.Null(tenant.StripeCustomerId);
        Assert.Null(tenant.StripeSubscriptionId);
        Assert.Null(tenant.BillingInterval);
        Assert.Null(tenant.TrialEndsAt);
        Assert.Null(tenant.DelinquencyStartedAt);
    }

    [Theory]
    [InlineData(BillingStatus.Free)]
    [InlineData(BillingStatus.Trialing)]
    [InlineData(BillingStatus.Active)]
    [InlineData(BillingStatus.PastDue)]
    [InlineData(BillingStatus.OnHold)]
    [InlineData(BillingStatus.Canceled)]
    public void Suspended_Always_Blocks_Regardless_Of_BillingStatus(BillingStatus billingStatus)
    {
        var evaluation = TenantAccessEvaluator.Evaluate(TenantStatus.Suspended, billingStatus);

        Assert.Equal(TenantAccessMode.Blocked, evaluation.AdminAccess);
        Assert.False(evaluation.PublicRegistrationAllowed);
        Assert.Equal(TenantPublicSurface.Maintenance, evaluation.PublicSurface);
        Assert.False(evaluation.ShowSettleBanner);
    }

    [Theory]
    [InlineData(BillingStatus.Free)]
    [InlineData(BillingStatus.Trialing)]
    [InlineData(BillingStatus.Active)]
    [InlineData(BillingStatus.PastDue)]
    [InlineData(BillingStatus.OnHold)]
    [InlineData(BillingStatus.Canceled)]
    public void Archived_Always_Blocks_With_NotFound(BillingStatus billingStatus)
    {
        var evaluation = TenantAccessEvaluator.Evaluate(TenantStatus.Archived, billingStatus);

        Assert.Equal(TenantAccessMode.Blocked, evaluation.AdminAccess);
        Assert.False(evaluation.PublicRegistrationAllowed);
        Assert.Equal(TenantPublicSurface.NotFound, evaluation.PublicSurface);
    }

    [Theory]
    [InlineData(BillingStatus.Free, false)]
    [InlineData(BillingStatus.Trialing, false)]
    [InlineData(BillingStatus.Active, false)]
    [InlineData(BillingStatus.PastDue, true)]
    [InlineData(BillingStatus.Canceled, false)]
    public void Active_Full_Access_Billing_States(BillingStatus billingStatus, bool expectSettleBanner)
    {
        var evaluation = TenantAccessEvaluator.Evaluate(TenantStatus.Active, billingStatus);

        Assert.Equal(TenantAccessMode.Full, evaluation.AdminAccess);
        Assert.True(evaluation.PublicRegistrationAllowed);
        Assert.Equal(TenantPublicSurface.Available, evaluation.PublicSurface);
        Assert.Equal(expectSettleBanner, evaluation.ShowSettleBanner);
    }

    [Fact]
    public void Active_OnHold_Is_ReadOnly_Without_Changing_Status()
    {
        var tenant = new Tenant
        {
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.OnHold,
        };

        var evaluation = TenantAccessEvaluator.Evaluate(tenant);

        Assert.Equal(TenantAccessMode.ReadOnly, evaluation.AdminAccess);
        Assert.False(evaluation.PublicRegistrationAllowed);
        Assert.Equal(TenantPublicSurface.Available, evaluation.PublicSurface);
        Assert.Equal(TenantStatus.Active, tenant.Status);
        Assert.Equal(BillingStatus.OnHold, tenant.BillingStatus);
    }

    [Fact]
    public void Suspended_With_BillingStatus_Active_Is_Still_Blocked()
    {
        var evaluation = TenantAccessEvaluator.Evaluate(TenantStatus.Suspended, BillingStatus.Active);

        Assert.Equal(TenantAccessMode.Blocked, evaluation.AdminAccess);
        Assert.Equal(TenantPublicSurface.Maintenance, evaluation.PublicSurface);
    }
}
