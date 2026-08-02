using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Site;

namespace Cohestra.Infrastructure.Tests.Site;

public sealed class SiteSectionPlanGateTests
{
    [Theory]
    [InlineData("hero", TenantPlan.Core, true)]
    [InlineData("highlights", TenantPlan.Core, true)]
    [InlineData("carousel", TenantPlan.Core, false)]
    [InlineData("testimonials", TenantPlan.Core, false)]
    [InlineData("carousel", TenantPlan.Pro, true)]
    [InlineData("ctaBand", TenantPlan.Enterprise, true)]
    public void IsAllowedForPlan_matches_essentials_and_studio_split(
        string sectionType,
        TenantPlan plan,
        bool expected)
    {
        Assert.Equal(expected, SiteSectionPlanGate.IsAllowedForPlan(sectionType, plan));
    }

    [Theory]
    [InlineData("community", TenantPlan.Core, true)]
    [InlineData("minimal", TenantPlan.Core, true)]
    [InlineData("showcase", TenantPlan.Core, false)]
    [InlineData("event-hub", TenantPlan.Core, false)]
    [InlineData("showcase", TenantPlan.Pro, true)]
    public void IsPresetAllowedForPlan_matches_essentials_and_studio_presets(
        string presetId,
        TenantPlan plan,
        bool expected)
    {
        Assert.Equal(expected, SiteSectionPlanGate.IsPresetAllowedForPlan(presetId, plan));
    }
}
