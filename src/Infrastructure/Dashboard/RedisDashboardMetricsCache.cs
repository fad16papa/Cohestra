using System.Text.Json;
using Cohestra.Contracts.Dashboard;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Dashboard;

public sealed class RedisDashboardMetricsCache(IConnectionMultiplexer redis)
{
    private const string CacheKey = "dashboard:metrics";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<DashboardMetricsResponse?> GetAsync(CancellationToken cancellationToken = default)
    {
        var value = await redis
            .GetDatabase()
            .StringGetAsync(CacheKey)
            .WaitAsync(cancellationToken);

        if (value.IsNullOrEmpty)
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<DashboardMetricsResponse>(value!, JsonOptions);
        }
        catch (JsonException)
        {
            await redis
                .GetDatabase()
                .KeyDeleteAsync(CacheKey)
                .WaitAsync(cancellationToken);
            return null;
        }
    }

    public Task SetAsync(
        DashboardMetricsResponse metrics,
        CancellationToken cancellationToken = default)
    {
        var json = JsonSerializer.Serialize(metrics, JsonOptions);

        return redis
            .GetDatabase()
            .StringSetAsync(CacheKey, json, CacheTtl)
            .WaitAsync(cancellationToken);
    }
}
