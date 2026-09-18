using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class RegistrationExperienceResolverTests
{
    [Fact]
    public void Resolve_WithoutExperience_DefaultsClassicToCenteredModern()
    {
        var theme = new RegistrationTheme { Preset = RegistrationThemePresets.Classic };

        var resolved = RegistrationExperienceResolver.Resolve(theme);

        Assert.Equal(RegistrationExperienceLayouts.Centered, resolved.Layout);
        Assert.Equal(RegistrationExperienceStyles.Modern, resolved.Style);
        Assert.Equal(RegistrationExperienceFlows.SinglePage, resolved.Flow);
    }

    [Fact]
    public void Resolve_ImmersivePreset_DefaultsFullBleedHero()
    {
        var theme = new RegistrationTheme { Preset = RegistrationThemePresets.Immersive };

        var resolved = RegistrationExperienceResolver.Resolve(theme);

        Assert.Equal(RegistrationExperienceHeroDisplays.FullBleed, resolved.HeroDisplay);
    }

    [Fact]
    public void Resolve_ExplicitExperience_OverridesDefaults()
    {
        var theme = new RegistrationTheme
        {
            Preset = RegistrationThemePresets.Classic,
            Experience = new RegistrationExperience
            {
                Layout = RegistrationExperienceLayouts.Split,
                Style = RegistrationExperienceStyles.Editorial,
                Flow = RegistrationExperienceFlows.Sections,
                HeroDisplay = RegistrationExperienceHeroDisplays.Split,
            },
        };

        var resolved = RegistrationExperienceResolver.Resolve(theme);

        Assert.Equal(RegistrationExperienceLayouts.Split, resolved.Layout);
        Assert.Equal(RegistrationExperienceStyles.Editorial, resolved.Style);
        Assert.Equal(RegistrationExperienceFlows.Sections, resolved.Flow);
        Assert.Equal(RegistrationExperienceHeroDisplays.Split, resolved.HeroDisplay);
    }
}
