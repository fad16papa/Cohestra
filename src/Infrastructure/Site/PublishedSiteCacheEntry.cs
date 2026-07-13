using Cohestra.Contracts.Site;

namespace Cohestra.Infrastructure.Site;

public sealed record PublishedSiteCacheEntry(
    SiteSectionsDocumentDto Published,
    DateTimeOffset PublishedAt);
