namespace Cohestra.Contracts.Activities;

public sealed record RegistrationDesignTokensDto(
    string? TypographyScale = null,
    string? FieldSize = null,
    string? FieldRadius = null,
    string? ButtonWidth = null,
    string? SurfaceEmphasis = null);

public sealed record ResolvedRegistrationDesignTokensDto(
    string TypographyScale,
    string FieldSize,
    string FieldRadius,
    string ButtonWidth,
    string SurfaceEmphasis);

public sealed record RegistrationThemeDto(
    string Preset,
    bool InheritCommunityBrand,
    string? AccentColor,
    string? HeroImageUrl,
    RegistrationExperienceDto? Experience = null,
    RegistrationDesignTokensDto? DesignTokens = null);

public sealed record ResolvedRegistrationThemeDto(
    string Preset,
    bool InheritCommunityBrand,
    string? AccentColor,
    string? HeroImageUrl,
    string? LogoAssetId,
    ResolvedRegistrationExperienceDto ResolvedExperience,
    ResolvedRegistrationDesignTokensDto ResolvedDesignTokens);
