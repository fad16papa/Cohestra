using System.Text.Json;
using Cohestra.Contracts.Activities;
using Cohestra.Infrastructure.Tenancy;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Activities;

public sealed class RedisPublicActivityCache(IConnectionMultiplexer redis)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<PublicActivityResponse?> GetAsync(
        Guid tenantId,
        string normalizedSlug,
        CancellationToken cancellationToken = default)
    {
        var key = TenantRedisKeys.PublicActivity(tenantId, normalizedSlug);
        var db = redis.GetDatabase();
        var value = await db.StringGetAsync(key).WaitAsync(cancellationToken);

        if (value.IsNullOrEmpty)
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<PublicActivityResponse>(value!, JsonOptions);
        }
        catch (JsonException)
        {
            await db.KeyDeleteAsync(key).WaitAsync(cancellationToken);
            return null;
        }
    }

    public async Task SetAsync(
        Guid tenantId,
        string normalizedSlug,
        PublicActivityResponse response,
        CancellationToken cancellationToken = default)
    {
        var key = TenantRedisKeys.PublicActivity(tenantId, normalizedSlug);
        var json = JsonSerializer.Serialize(response, JsonOptions);
        await redis
            .GetDatabase()
            .StringSetAsync(key, json)
            .WaitAsync(cancellationToken);
    }

    public Task InvalidateAsync(
        Guid tenantId,
        string normalizedSlug,
        CancellationToken cancellationToken = default) =>
        redis
            .GetDatabase()
            .KeyDeleteAsync(TenantRedisKeys.PublicActivity(tenantId, normalizedSlug))
            .WaitAsync(cancellationToken);
}
