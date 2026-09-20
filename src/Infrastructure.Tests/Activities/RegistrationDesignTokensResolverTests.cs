using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Activities;
using Xunit;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class RegistrationDesignTokensResolverTests
{
    [Fact]
    public void Resolve_MinimalStyle_DefaultsSurfaceToFlat()
    {
        var theme = new RegistrationTheme
        {
            Experience = new RegistrationExperience
            {
                Style = RegistrationExperienceStyles.Minimal,
            },
        };

        var resolved = RegistrationDesignTokensResolver.Resolve(theme);

        Assert.Equal(RegistrationSurfaceEmphases.Flat, resolved.SurfaceEmphasis);
    }

    [Fact]
    public void Resolve_StoredTokens_Normalized()
    {
        var theme = new RegistrationTheme
        {
            DesignTokens = new RegistrationDesignTokens
            {
                TypographyScale = RegistrationTypographyScales.Spacious,
                FieldSize = RegistrationFieldSizes.Comfortable,
                FieldRadius = RegistrationFieldRadii.Lg,
                ButtonWidth = RegistrationButtonWidths.Auto,
                SurfaceEmphasis = RegistrationSurfaceEmphases.Elevated,
            },
        };

        var resolved = RegistrationDesignTokensResolver.Resolve(theme);

        Assert.Equal(RegistrationTypographyScales.Spacious, resolved.TypographyScale);
        Assert.Equal(RegistrationFieldSizes.Comfortable, resolved.FieldSize);
        Assert.Equal(RegistrationFieldRadii.Lg, resolved.FieldRadius);
        Assert.Equal(RegistrationButtonWidths.Auto, resolved.ButtonWidth);
        Assert.Equal(RegistrationSurfaceEmphases.Elevated, resolved.SurfaceEmphasis);
    }
}
