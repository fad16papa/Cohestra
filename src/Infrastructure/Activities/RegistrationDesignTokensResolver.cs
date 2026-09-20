using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;

namespace Cohestra.Infrastructure.Activities;

internal static class RegistrationDesignTokensResolver
{
    public static ResolvedRegistrationDesignTokens Resolve(RegistrationTheme theme)
    {
        var experience = RegistrationExperienceResolver.Resolve(theme);
        var stored = theme.DesignTokens;
        var style = experience.Style;

        var surfaceDefault =
            style is RegistrationExperienceStyles.Minimal
                ? RegistrationSurfaceEmphases.Flat
                : RegistrationSurfaceEmphases.Soft;

        return new ResolvedRegistrationDesignTokens
        {
            TypographyScale = Pick(
                stored?.TypographyScale,
                RegistrationTypographyScales.All,
                RegistrationTypographyScales.Default),
            FieldSize = Pick(
                stored?.FieldSize,
                RegistrationFieldSizes.All,
                RegistrationFieldSizes.Default),
            FieldRadius = Pick(
                stored?.FieldRadius,
                RegistrationFieldRadii.All,
                RegistrationFieldRadii.Md),
            ButtonWidth = Pick(
                stored?.ButtonWidth,
                RegistrationButtonWidths.All,
                RegistrationButtonWidths.Full),
            SurfaceEmphasis = Pick(
                stored?.SurfaceEmphasis,
                RegistrationSurfaceEmphases.All,
                surfaceDefault),
        };
    }

    public static ResolvedRegistrationDesignTokensDto ToDto(ResolvedRegistrationDesignTokens tokens) =>
        new(
            tokens.TypographyScale,
            tokens.FieldSize,
            tokens.FieldRadius,
            tokens.ButtonWidth,
            tokens.SurfaceEmphasis);

    private static string Pick(string? value, IReadOnlySet<string> allowed, string fallback) =>
        value is not null && allowed.Contains(value) ? value : fallback;
}
