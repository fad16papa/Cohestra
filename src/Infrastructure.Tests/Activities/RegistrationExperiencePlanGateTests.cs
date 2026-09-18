using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class RegistrationExperiencePlanGateTests
{
    [Fact]
    public void EnsureAllowed_BasicSplitLayout_ReturnsError()
    {
        var theme = new RegistrationTheme
        {
            Experience = new RegistrationExperience { Layout = RegistrationExperienceLayouts.Split },
        };

        var error = RegistrationExperiencePlanGate.EnsureAllowed(theme, TenantPlan.Basic);

        Assert.NotNull(error);
    }

    [Fact]
    public void NormalizeForPlan_Basic_ConversationalFlow_ClearsToSinglePage()
    {
        var theme = new RegistrationTheme
        {
            Experience = new RegistrationExperience
            {
                Layout = RegistrationExperienceLayouts.Centered,
                Flow = RegistrationExperienceFlows.Conversational,
            },
        };

        RegistrationExperiencePlanGate.NormalizeForPlan(theme, TenantPlan.Basic);

        var resolved = RegistrationExperienceResolver.Resolve(theme);
        Assert.Equal(RegistrationExperienceFlows.SinglePage, resolved.Flow);
    }

    [Fact]
    public void EnsureAllowed_CoreConversational_ReturnsError()
    {
        var theme = new RegistrationTheme
        {
            Experience = new RegistrationExperience { Flow = RegistrationExperienceFlows.Conversational },
        };

        var error = RegistrationExperiencePlanGate.EnsureAllowed(theme, TenantPlan.Core);

        Assert.Contains("Pro", error, StringComparison.OrdinalIgnoreCase);
    }
}
