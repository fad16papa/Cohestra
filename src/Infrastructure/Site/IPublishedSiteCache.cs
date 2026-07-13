namespace Cohestra.Infrastructure.Site;

public interface IPublishedSiteCache
{
    Task<PublishedSiteCacheEntry?> GetAsync(CancellationToken cancellationToken = default);

    Task SetAsync(PublishedSiteCacheEntry entry, CancellationToken cancellationToken = default);

    Task InvalidateAsync(CancellationToken cancellationToken = default);
}
