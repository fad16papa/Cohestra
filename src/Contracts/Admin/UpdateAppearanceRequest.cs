namespace LeadGenerationCrm.Contracts.Admin;

public sealed record UpdateAppearanceRequest(
    string? ThemePreference,
    string? BrandAccentColor);
