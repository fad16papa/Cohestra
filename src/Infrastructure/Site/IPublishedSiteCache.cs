namespace Cohestra.Infrastructure.Site;

public interface IPublishedSiteCache
{
    Task<PublishedSiteCacheEntry?> GetAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task SetAsync(Guid tenantId, PublishedSiteCacheEntry entry, CancellationToken cancellationToken = default);

    Task InvalidateAsync(Guid tenantId, CancellationToken cancellationToken = default);
}
