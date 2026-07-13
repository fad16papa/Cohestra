using System.Text.Json;
using LeadGenerationCrm.Contracts.Activities;
using StackExchange.Redis;

namespace LeadGenerationCrm.Infrastructure.Activities;

public sealed class RedisPublicActivityCache(IConnectionMultiplexer redis)
{
    private const string KeyPrefix = "public:activity:";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<PublicActivityResponse?> GetAsync(
        string normalizedSlug,
        CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        var value = await db
            .StringGetAsync(KeyPrefix + normalizedSlug)
            .WaitAsync(cancellationToken);

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
            await db
                .KeyDeleteAsync(KeyPrefix + normalizedSlug)
                .WaitAsync(cancellationToken);
            return null;
        }
    }

    public async Task SetAsync(
        string normalizedSlug,
        PublicActivityResponse response,
        CancellationToken cancellationToken = default)
    {
        var json = JsonSerializer.Serialize(response, JsonOptions);
        await redis
            .GetDatabase()
            .StringSetAsync(KeyPrefix + normalizedSlug, json)
            .WaitAsync(cancellationToken);
    }

    public Task InvalidateAsync(string normalizedSlug, CancellationToken cancellationToken = default) =>
        redis
            .GetDatabase()
            .KeyDeleteAsync(KeyPrefix + normalizedSlug)
            .WaitAsync(cancellationToken);
}
