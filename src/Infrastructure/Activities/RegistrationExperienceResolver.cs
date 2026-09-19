using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;

namespace Cohestra.Infrastructure.Activities;

internal static class RegistrationExperienceResolver
{
    public static ResolvedRegistrationExperience Resolve(RegistrationTheme theme)
    {
        var preset = RegistrationThemeValidator.NormalizePreset(theme.Preset);
        var defaults = DefaultsFromLegacyPreset(preset);

        var layout = NormalizeOrDefault(
            theme.Experience?.Layout,
            RegistrationExperienceLayouts.All,
            defaults.Layout);
        var style = NormalizeOrDefault(
            theme.Experience?.Style,
            RegistrationExperienceStyles.All,
            defaults.Style);
        var flow = NormalizeOrDefault(
            theme.Experience?.Flow,
            RegistrationExperienceFlows.All,
            defaults.Flow);
        var heroDisplay = NormalizeOrDefault(
            theme.Experience?.HeroDisplay,
            RegistrationExperienceHeroDisplays.All,
            defaults.HeroDisplay);

        return new ResolvedRegistrationExperience
        {
            Layout = layout,
            Style = style,
            Flow = flow,
            HeroDisplay = heroDisplay,
        };
    }

    public static ResolvedRegistrationExperienceDto ToDto(ResolvedRegistrationExperience resolved) =>
        new(resolved.Layout, resolved.Style, resolved.Flow, resolved.HeroDisplay);

    internal static ResolvedRegistrationExperience DefaultsFromLegacyPreset(string preset) =>
        preset switch
        {
            RegistrationThemePresets.Card => new ResolvedRegistrationExperience
            {
                Layout = RegistrationExperienceLayouts.Card,
                Style = RegistrationExperienceStyles.Modern,
                Flow = RegistrationExperienceFlows.SinglePage,
                HeroDisplay = RegistrationExperienceHeroDisplays.Cover,
            },
            RegistrationThemePresets.Immersive => new ResolvedRegistrationExperience
            {
                Layout = RegistrationExperienceLayouts.Immersive,
                Style = RegistrationExperienceStyles.Modern,
                Flow = RegistrationExperienceFlows.SinglePage,
                HeroDisplay = RegistrationExperienceHeroDisplays.FullBleed,
            },
            RegistrationThemePresets.Compact => new ResolvedRegistrationExperience
            {
                Layout = RegistrationExperienceLayouts.Centered,
                Style = RegistrationExperienceStyles.Minimal,
                Flow = RegistrationExperienceFlows.SinglePage,
                HeroDisplay = RegistrationExperienceHeroDisplays.Cover,
            },
            _ => new ResolvedRegistrationExperience
            {
                Layout = RegistrationExperienceLayouts.Centered,
                Style = RegistrationExperienceStyles.Modern,
                Flow = RegistrationExperienceFlows.SinglePage,
                HeroDisplay = RegistrationExperienceHeroDisplays.Cover,
            },
        };

    private static string NormalizeOrDefault(
        string? value,
        IReadOnlySet<string> allowed,
        string fallback) =>
        value is not null && allowed.Contains(value) ? value : fallback;
}
