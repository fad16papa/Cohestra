using System.Text.Json;
using Cohestra.Infrastructure.Tenancy;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Site;

public sealed class RedisPublishedSiteCache(IConnectionMultiplexer redis) : IPublishedSiteCache
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(15);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<PublishedSiteCacheEntry?> GetAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var key = TenantRedisKeys.PublishedSite(tenantId);
        var db = redis.GetDatabase();
        var value = await db.StringGetAsync(key).WaitAsync(cancellationToken);

        if (value.IsNullOrEmpty)
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<PublishedSiteCacheEntry>(value!, JsonOptions);
        }
        catch (JsonException)
        {
            await db.KeyDeleteAsync(key).WaitAsync(cancellationToken);
            return null;
        }
    }

    public async Task SetAsync(
        Guid tenantId,
        PublishedSiteCacheEntry entry,
        CancellationToken cancellationToken = default)
    {
        var key = TenantRedisKeys.PublishedSite(tenantId);
        var json = JsonSerializer.Serialize(entry, JsonOptions);
        await redis
            .GetDatabase()
            .StringSetAsync(key, json, CacheTtl)
            .WaitAsync(cancellationToken);
    }

    public Task InvalidateAsync(Guid tenantId, CancellationToken cancellationToken = default) =>
        redis.GetDatabase().KeyDeleteAsync(TenantRedisKeys.PublishedSite(tenantId)).WaitAsync(cancellationToken);
}
