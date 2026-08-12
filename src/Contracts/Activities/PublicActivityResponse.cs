namespace Cohestra.Contracts.Activities;

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
    string Preset,
    string? LogoAssetId,
    ActivityFormSchemaDto? FormSchema,
    int? MaxRegistrants,
    int RegistrationCount,
    bool IsRegistrationFull,
    bool IsRegistrationPaused);
