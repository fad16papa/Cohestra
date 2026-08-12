namespace Cohestra.Contracts.Activities;

public sealed record RegistrationThemeDto(
    string Preset,
    bool InheritCommunityBrand,
    string? AccentColor,
    string? HeroImageUrl);

public sealed record ResolvedRegistrationThemeDto(
    string Preset,
    bool InheritCommunityBrand,
    string? AccentColor,
    string? HeroImageUrl,
    string? LogoAssetId);
