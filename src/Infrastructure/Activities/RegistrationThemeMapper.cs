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
            theme.HeroImageUrl,
            theme.Experience is null
                ? null
                : new RegistrationExperienceDto(
                    theme.Experience.Layout,
                    theme.Experience.Style,
                    theme.Experience.Flow,
                    theme.Experience.HeroDisplay),
            ToDesignTokensDto(theme.DesignTokens));
    }

    private static RegistrationDesignTokensDto? ToDesignTokensDto(RegistrationDesignTokens? tokens)
    {
        if (tokens is null)
        {
            return null;
        }

        return new RegistrationDesignTokensDto(
            tokens.TypographyScale,
            tokens.FieldSize,
            tokens.FieldRadius,
            tokens.ButtonWidth,
            tokens.SurfaceEmphasis);
    }

    private static RegistrationDesignTokens? FromDesignTokensDto(RegistrationDesignTokensDto? dto)
    {
        if (dto is null)
        {
            return null;
        }

        return new RegistrationDesignTokens
        {
            TypographyScale = dto.TypographyScale,
            FieldSize = dto.FieldSize,
            FieldRadius = dto.FieldRadius,
            ButtonWidth = dto.ButtonWidth,
            SurfaceEmphasis = dto.SurfaceEmphasis,
        };
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
            Experience = dto.Experience is null
                ? null
                : new RegistrationExperience
                {
                    Layout = dto.Experience.Layout,
                    Style = dto.Experience.Style,
                    Flow = dto.Experience.Flow,
                    HeroDisplay = dto.Experience.HeroDisplay,
                },
            DesignTokens = FromDesignTokensDto(dto.DesignTokens),
        };
    }
}
