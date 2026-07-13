namespace LeadGenerationCrm.Contracts.Activities;

public sealed record UpdateActivityRequest(
    string Name,
    string Category,
    string Schedule,
    string Location,
    string CommunityLabel,
    string? HeroImageUrl,
    string? AccentColor);
