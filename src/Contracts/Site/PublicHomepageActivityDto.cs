namespace LeadGenerationCrm.Contracts.Site;

public sealed record PublicHomepageActivityDto(
    string Slug,
    string Name,
    string Schedule,
    string Location,
    string CommunityLabel,
    string? HeroImageUrl,
    string? AccentColor);
