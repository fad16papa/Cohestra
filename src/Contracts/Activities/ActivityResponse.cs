namespace LeadGenerationCrm.Contracts.Activities;

public sealed record ActivityResponse(
    Guid Id,
    string Name,
    string Slug,
    string Category,
    string Schedule,
    string Location,
    string CommunityLabel,
    string? HeroImageUrl,
    string? AccentColor,
    string Status,
    bool ShowOnHomepage,
    ActivityFormSchemaDto? FormSchema,
    int RegistrationCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
