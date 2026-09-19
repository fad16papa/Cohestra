using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class RegistrationThemeValidatorExperienceTests
{
    [Fact]
    public void Validate_RejectsUnknownExperienceLayout()
    {
        var theme = new RegistrationTheme
        {
            Experience = new RegistrationExperience { Layout = "bento-grid" },
        };

        var error = RegistrationThemeValidator.Validate(theme);

        Assert.Contains("layout", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Normalize_StripsInvalidExperienceFields()
    {
        var theme = new RegistrationTheme
        {
            Preset = RegistrationThemePresets.Classic,
            Experience = new RegistrationExperience
            {
                Layout = "invalid",
                Style = RegistrationExperienceStyles.Modern,
            },
        };

        var normalized = RegistrationThemeValidator.Normalize(theme);

        Assert.Null(normalized.Experience!.Layout);
        Assert.Equal(RegistrationExperienceStyles.Modern, normalized.Experience.Style);
    }

    [Fact]
    public void Resolve_NullThemeDefaultsClassicCentered()
    {
        var resolved = RegistrationExperienceResolver.Resolve(new RegistrationTheme());

        Assert.Equal(RegistrationExperienceLayouts.Centered, resolved.Layout);
    }
}
