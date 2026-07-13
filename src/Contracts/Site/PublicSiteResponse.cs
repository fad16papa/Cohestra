namespace Cohestra.Contracts.Site;

/// <summary>Published site payload for anonymous public read (Story 9.2).</summary>
public sealed record PublicSiteResponse(
    SiteSectionsDocumentDto Published,
    DateTimeOffset? PublishedAt,
    IReadOnlyList<PublicHomepageActivityDto> UpcomingActivities);
