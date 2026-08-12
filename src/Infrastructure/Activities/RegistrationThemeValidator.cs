using Cohestra.Domain.Activities;

namespace Cohestra.Infrastructure.Activities;

internal static class RegistrationThemeValidator
{
    public static string? Validate(RegistrationTheme? theme)
    {
        if (theme is null)
        {
            return null;
        }

        if (!RegistrationThemePresets.All.Contains(theme.Preset))
        {
            return "Registration theme preset must be classic, card, immersive, or compact.";
        }

        return ActivityBrandingValidator.ValidateAccentColor(theme.AccentColor)
            ?? ActivityBrandingValidator.ValidateHeroImageUrl(theme.HeroImageUrl);
    }

    public static string? ValidateThemeAccent(RegistrationTheme? theme) =>
        Validate(theme)
        ?? ActivityBrandingContrastValidator.ValidateAccentContrastForWhiteText(theme?.AccentColor);

    public static RegistrationTheme Normalize(RegistrationTheme theme)
    {
        return new RegistrationTheme
        {
            Preset = NormalizePreset(theme.Preset),
            InheritCommunityBrand = theme.InheritCommunityBrand,
            AccentColor = ActivityBrandingValidator.NormalizeAccentColor(theme.AccentColor),
            HeroImageUrl = ActivityBrandingValidator.NormalizeHeroImageUrl(theme.HeroImageUrl),
        };
    }

    public static string NormalizePreset(string? preset) =>
        preset is not null && RegistrationThemePresets.All.Contains(preset)
            ? preset
            : RegistrationThemePresets.Classic;
}
