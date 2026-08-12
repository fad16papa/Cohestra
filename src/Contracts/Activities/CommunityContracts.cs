namespace Cohestra.Contracts.Activities;

public sealed record CommunityListItemResponse(
    Guid Id,
    string Name,
    int ActivityCount,
    int LeadCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CommunityListResponse(IReadOnlyList<CommunityListItemResponse> Items);

public sealed record CommunityResponse(
    Guid Id,
    string Name,
    int ActivityCount,
    int LeadCount,
    string? LogoAssetId,
    string? AccentColor,
    string? DefaultHeroImageUrl,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CreateCommunityRequest(string Name);

public sealed record UpdateCommunityRequest(
    string Name,
    string? LogoAssetId = null,
    string? AccentColor = null,
    string? DefaultHeroImageUrl = null);
