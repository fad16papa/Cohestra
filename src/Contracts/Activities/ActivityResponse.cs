namespace Cohestra.Contracts.Activities;

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
    RegistrationThemeDto? RegistrationTheme,
    ResolvedRegistrationThemeDto ResolvedRegistrationTheme,
    string Status,
    bool ShowOnHomepage,
    ActivityFormSchemaDto? FormSchema,
    int? MaxRegistrants,
    int RegistrationCount,
    DateTimeOffset? ScheduledStartsAt,
    bool IsRegistrationOpen,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
