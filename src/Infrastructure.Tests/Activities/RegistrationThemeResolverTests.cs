using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class RegistrationThemeResolverTests
{
    [Fact]
    public void Resolve_WhenInheritTrue_UsesCommunityBrandWhenThemeAndActivityEmpty()
    {
        var activity = new Activity
        {
            CommunityLabel = "Pickleball",
            HeroImageUrl = null,
            AccentColor = null,
        };

        var community = new Community
        {
            Name = "Pickleball",
            AccentColor = "#2d6a4f",
            DefaultHeroImageUrl = "https://example.com/community-hero.jpg",
            LogoAssetId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        };

        var resolved = RegistrationThemeResolver.Resolve(
            new RegistrationTheme { InheritCommunityBrand = true, Preset = RegistrationThemePresets.Card },
            community,
            activity);

        Assert.Equal("#2d6a4f", resolved.AccentColor);
        Assert.Equal("https://example.com/community-hero.jpg", resolved.HeroImageUrl);
        Assert.Equal("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", resolved.LogoAssetId);
        Assert.Equal(RegistrationThemePresets.Card, resolved.Preset);
    }

    [Fact]
    public void Resolve_WhenInheritFalse_SkipsCommunityBrand()
    {
        var activity = new Activity
        {
            AccentColor = "#111111",
            HeroImageUrl = "https://example.com/activity-hero.jpg",
        };

        var community = new Community
        {
            AccentColor = "#2d6a4f",
            DefaultHeroImageUrl = "https://example.com/community-hero.jpg",
            LogoAssetId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        };

        var resolved = RegistrationThemeResolver.Resolve(
            new RegistrationTheme { InheritCommunityBrand = false },
            community,
            activity);

        Assert.Equal("#111111", resolved.AccentColor);
        Assert.Equal("https://example.com/activity-hero.jpg", resolved.HeroImageUrl);
        Assert.Null(resolved.LogoAssetId);
    }

    [Fact]
    public void Resolve_ThemeOverrideWinsOverCommunityWhenInheritTrue()
    {
        var activity = new Activity();
        var community = new Community
        {
            AccentColor = "#2d6a4f",
            DefaultHeroImageUrl = "https://example.com/community-hero.jpg",
        };

        var resolved = RegistrationThemeResolver.Resolve(
            new RegistrationTheme
            {
                InheritCommunityBrand = true,
                AccentColor = "#ff0000",
                HeroImageUrl = "https://example.com/theme-hero.jpg",
            },
            community,
            activity);

        Assert.Equal("#ff0000", resolved.AccentColor);
        Assert.Equal("https://example.com/theme-hero.jpg", resolved.HeroImageUrl);
    }
}
