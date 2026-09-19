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
    public void EnsureAllowed_BasicPosterLayout_ReturnsError()
    {
        var theme = new RegistrationTheme
        {
            Experience = new RegistrationExperience { Layout = RegistrationExperienceLayouts.Poster },
        };

        var error = RegistrationExperiencePlanGate.EnsureAllowed(theme, TenantPlan.Basic);

        Assert.NotNull(error);
    }

    [Fact]
    public void EnsureAllowed_BasicCardLayout_Allowed()
    {
        var theme = new RegistrationTheme
        {
            Preset = RegistrationThemePresets.Card,
            Experience = new RegistrationExperience { Layout = RegistrationExperienceLayouts.Card },
        };

        var error = RegistrationExperiencePlanGate.EnsureAllowed(theme, TenantPlan.Basic);

        Assert.Null(error);
    }

    [Fact]
    public void EnsureAllowed_CoreImmersivePreset_ReturnsError()
    {
        var theme = new RegistrationTheme { Preset = RegistrationThemePresets.Immersive };

        var error = RegistrationExperiencePlanGate.EnsureAllowed(theme, TenantPlan.Core);

        Assert.Contains("Pro", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void NormalizeForPlan_Basic_PreservesCardLayout()
    {
        var theme = new RegistrationTheme
        {
            Preset = RegistrationThemePresets.Card,
            Experience = new RegistrationExperience { Layout = RegistrationExperienceLayouts.Card },
        };

        RegistrationExperiencePlanGate.NormalizeForPlan(theme, TenantPlan.Basic);

        var resolved = RegistrationExperienceResolver.Resolve(theme);
        Assert.Equal(RegistrationExperienceLayouts.Card, resolved.Layout);
        Assert.Equal(RegistrationExperienceFlows.SinglePage, resolved.Flow);
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

    [Fact]
    public void EnsureAllowed_BasicFullBleedHero_ReturnsError()
    {
        var theme = new RegistrationTheme
        {
            Experience = new RegistrationExperience
            {
                HeroDisplay = RegistrationExperienceHeroDisplays.FullBleed,
            },
        };

        var error = RegistrationExperiencePlanGate.EnsureAllowed(theme, TenantPlan.Basic);

        Assert.NotNull(error);
    }

    [Fact]
    public void EnsureAllowed_CoreImmersiveLayout_ReturnsError()
    {
        var theme = new RegistrationTheme
        {
            Experience = new RegistrationExperience { Layout = RegistrationExperienceLayouts.Immersive },
        };

        var error = RegistrationExperiencePlanGate.EnsureAllowed(theme, TenantPlan.Core);

        Assert.Contains("Pro", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void EnsureAllowed_ProConversational_Allowed()
    {
        var theme = new RegistrationTheme
        {
            Experience = new RegistrationExperience { Flow = RegistrationExperienceFlows.Conversational },
        };

        var error = RegistrationExperiencePlanGate.EnsureAllowed(theme, TenantPlan.Pro);

        Assert.Null(error);
    }
}
