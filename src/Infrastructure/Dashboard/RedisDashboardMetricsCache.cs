using System.Text.Json;
using Cohestra.Application.Dashboard;
using Cohestra.Contracts.Dashboard;
using Cohestra.Infrastructure.Tenancy;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Dashboard;

public sealed class RedisDashboardMetricsCache(IConnectionMultiplexer redis) : IDashboardMetricsCache
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<DashboardMetricsResponse?> GetAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var key = TenantRedisKeys.DashboardMetrics(tenantId);
        var value = await redis
            .GetDatabase()
            .StringGetAsync(key)
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
                .KeyDeleteAsync(key)
                .WaitAsync(cancellationToken);
            return null;
        }
    }

    public Task SetAsync(
        Guid tenantId,
        DashboardMetricsResponse metrics,
        CancellationToken cancellationToken = default)
    {
        var key = TenantRedisKeys.DashboardMetrics(tenantId);
        var json = JsonSerializer.Serialize(metrics, JsonOptions);

        return redis
            .GetDatabase()
            .StringSetAsync(key, json, CacheTtl)
            .WaitAsync(cancellationToken);
    }
}
