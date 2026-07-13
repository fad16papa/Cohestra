using System.Text.Json;
using StackExchange.Redis;

namespace LeadGenerationCrm.Infrastructure.Site;

public sealed class RedisPublishedSiteCache(IConnectionMultiplexer redis) : IPublishedSiteCache
{
    internal const string CacheKey = "public:site:published";

    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(15);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<PublishedSiteCacheEntry?> GetAsync(CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        var value = await db.StringGetAsync(CacheKey).WaitAsync(cancellationToken);

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
            await db.KeyDeleteAsync(CacheKey).WaitAsync(cancellationToken);
            return null;
        }
    }

    public async Task SetAsync(
        PublishedSiteCacheEntry entry,
        CancellationToken cancellationToken = default)
    {
        var json = JsonSerializer.Serialize(entry, JsonOptions);
        await redis
            .GetDatabase()
            .StringSetAsync(CacheKey, json, CacheTtl)
            .WaitAsync(cancellationToken);
    }

    public Task InvalidateAsync(CancellationToken cancellationToken = default) =>
        redis.GetDatabase().KeyDeleteAsync(CacheKey).WaitAsync(cancellationToken);
}
