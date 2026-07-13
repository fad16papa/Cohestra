using LeadGenerationCrm.Contracts.Site;

namespace LeadGenerationCrm.Infrastructure.Site;

public sealed record PublishedSiteCacheEntry(
    SiteSectionsDocumentDto Published,
    DateTimeOffset PublishedAt);
