using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Tests.Tenants;

/// <summary>
/// Locks shipped plan caps for Epic 30 Capture (Story 30.10 / FR-RC-14).
/// Keep aligned with <c>web/lib/marketing/pricing-plans.ts</c>.
/// </summary>
public sealed class TenantPlanLimitsTests
{
    [Theory]
    [InlineData(TenantPlan.Basic, 1, 1, 4, 250, 1)]
    [InlineData(TenantPlan.Core, 3, 3, 12, 500, 5)]
    [InlineData(TenantPlan.Pro, 10, 10, 50, 5000, 25)]
    public void For_ShippedPlans_ReturnsExpectedCaps(
        TenantPlan plan,
        int seats,
        int communities,
        int publishedActivities,
        int registrationsPerMonth,
        int formTemplateSlots)
    {
        var limits = TenantPlanLimits.For(plan);

        Assert.Equal(seats, limits.Seats);
        Assert.Equal(communities, limits.Communities);
        Assert.Equal(publishedActivities, limits.PublishedActivities);
        Assert.Equal(registrationsPerMonth, limits.RegistrationsPerMonth);
        Assert.Equal(formTemplateSlots, FormTemplateSlotLimits.For(plan));
    }
}
