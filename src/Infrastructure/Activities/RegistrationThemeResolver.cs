using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;

namespace Cohestra.Infrastructure.Activities;

internal static class RegistrationThemeResolver
{
    public static ResolvedRegistrationThemeDto Resolve(
        RegistrationTheme? theme,
        Community? community,
        Activity activity)
    {
        var stored = theme ?? RegistrationTheme.Default;
        var inherit = stored.InheritCommunityBrand;

        string? accent;
        string? hero;
        string? logo;

        if (inherit && community is not null)
        {
            accent = stored.AccentColor ?? community.AccentColor ?? activity.AccentColor;
            hero = stored.HeroImageUrl ?? community.DefaultHeroImageUrl ?? activity.HeroImageUrl;
            logo = community.LogoAssetId;
        }
        else
        {
            accent = stored.AccentColor ?? activity.AccentColor;
            hero = stored.HeroImageUrl ?? activity.HeroImageUrl;
            logo = null;
        }

        return new ResolvedRegistrationThemeDto(
            RegistrationThemeValidator.NormalizePreset(stored.Preset),
            inherit,
            ActivityBrandingValidator.NormalizeAccentColor(accent),
            ActivityBrandingValidator.NormalizeHeroImageUrl(hero),
            CommunityBrandingValidator.NormalizeLogoAssetId(logo));
    }
}
