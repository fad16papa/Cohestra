namespace LeadGenerationCrm.Contracts.Activities;

public sealed record PublicActivityResponse(
    string Slug,
    string Name,
    string Status,
    bool IsRegistrationOpen,
    string Schedule,
    string Location,
    string CommunityLabel,
    string? HeroImageUrl,
    string? AccentColor,
    ActivityFormSchemaDto? FormSchema);
