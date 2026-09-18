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
            ?? ActivityBrandingValidator.ValidateHeroImageUrl(theme.HeroImageUrl)
            ?? ValidateExperience(theme.Experience);
    }

    private static string? ValidateExperience(RegistrationExperience? experience)
    {
        if (experience is null)
        {
            return null;
        }

        if (experience.Layout is not null
            && !RegistrationExperienceLayouts.All.Contains(experience.Layout))
        {
            return "Registration experience layout is not supported.";
        }

        if (experience.Style is not null
            && !RegistrationExperienceStyles.All.Contains(experience.Style))
        {
            return "Registration experience style is not supported.";
        }

        if (experience.Flow is not null
            && !RegistrationExperienceFlows.All.Contains(experience.Flow))
        {
            return "Registration experience flow is not supported.";
        }

        if (experience.HeroDisplay is not null
            && !RegistrationExperienceHeroDisplays.All.Contains(experience.HeroDisplay))
        {
            return "Registration experience hero display is not supported.";
        }

        return null;
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
            Experience = NormalizeExperience(theme.Experience),
        };
    }

    private static RegistrationExperience? NormalizeExperience(RegistrationExperience? experience)
    {
        if (experience is null)
        {
            return null;
        }

        return new RegistrationExperience
        {
            Layout = NormalizeOptional(experience.Layout, RegistrationExperienceLayouts.All),
            Style = NormalizeOptional(experience.Style, RegistrationExperienceStyles.All),
            Flow = NormalizeOptional(experience.Flow, RegistrationExperienceFlows.All),
            HeroDisplay = NormalizeOptional(experience.HeroDisplay, RegistrationExperienceHeroDisplays.All),
        };
    }

    private static string? NormalizeOptional(string? value, IReadOnlySet<string> allowed) =>
        value is not null && allowed.Contains(value) ? value : null;

    public static string NormalizePreset(string? preset) =>
        preset is not null && RegistrationThemePresets.All.Contains(preset)
            ? preset
            : RegistrationThemePresets.Classic;
}
