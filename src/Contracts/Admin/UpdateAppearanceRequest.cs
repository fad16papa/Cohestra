namespace Cohestra.Contracts.Admin;

public sealed record UpdateAppearanceRequest(
    string? ThemePreference,
    string? BrandAccentColor);
