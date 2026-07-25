namespace Cohestra.Contracts.PublicDoor;

public sealed record PublicDoorResponse(
    string Kind,
    string? Plan,
    string? TenantName,
    string? TenantSlug,
    PublicDoorSiteResponse? Site,
    IReadOnlyList<PublicStubActivityResponse> StubActivities,
    bool BuilderLocked);

public sealed record PublicDoorSiteResponse(
    PublicDoorSiteDocumentResponse Published,
    DateTimeOffset? PublishedAt,
    IReadOnlyList<PublicStubActivityResponse> UpcomingActivities);

public sealed record PublicDoorSiteDocumentResponse(
    int SchemaVersion,
    string SiteName,
    string? AccentColor,
    string? LogoAssetId,
    string? PresetId,
    IReadOnlyList<PublicDoorSiteSectionResponse> Sections);

public sealed record PublicDoorSiteSectionResponse(
    string Id,
    string Type,
    bool Enabled,
    int Order,
    object Props);

public sealed record PublicStubActivityResponse(
    string Slug,
    string Name,
    string Schedule,
    string Location,
    string CommunityLabel,
    string? HeroImageUrl,
    string? AccentColor);
