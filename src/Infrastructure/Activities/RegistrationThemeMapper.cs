using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;

namespace Cohestra.Infrastructure.Activities;

internal static class RegistrationThemeMapper
{
    public static RegistrationThemeDto? ToDto(RegistrationTheme? theme)
    {
        if (theme is null)
        {
            return null;
        }

        return new RegistrationThemeDto(
            RegistrationThemeValidator.NormalizePreset(theme.Preset),
            theme.InheritCommunityBrand,
            theme.AccentColor,
            theme.HeroImageUrl);
    }

    public static RegistrationTheme? FromDto(RegistrationThemeDto? dto)
    {
        if (dto is null)
        {
            return null;
        }

        return new RegistrationTheme
        {
            Preset = dto.Preset,
            InheritCommunityBrand = dto.InheritCommunityBrand,
            AccentColor = dto.AccentColor,
            HeroImageUrl = dto.HeroImageUrl,
        };
    }
}
