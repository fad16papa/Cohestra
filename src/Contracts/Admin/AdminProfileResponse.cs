namespace LeadGenerationCrm.Contracts.Admin;

public sealed record AdminProfileResponse(
    string UserId,
    string Email,
    string? Nickname,
    string[] Roles,
    string ThemePreference,
    string? BrandAccentColor);
