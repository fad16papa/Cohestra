namespace Cohestra.Contracts.Site;

public sealed record SitePageAdminResponse(
    SiteSectionsDocumentDto Draft,
    SiteSectionsDocumentDto? Published,
    DateTimeOffset DraftUpdatedAt,
    DateTimeOffset? PublishedAt,
    string? PublishedByUserId,
    bool HasUnpublishedChanges,
    bool CanRevertPublished,
    DateTimeOffset? PreviousPublishedAt,
    IReadOnlyList<SiteHomepageTemplateSummaryDto> SavedTemplates,
    bool BuilderLocked);
