using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Cohestra.Application.Auth;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Auth;

public sealed class RedisAuthHandoffStore(
    IConnectionMultiplexer redis,
    IOptions<AuthHandoffOptions> options) : IAuthHandoffStore
{
    private const string KeyPrefix = "auth:handoff:";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<(string Code, int ExpiresInSeconds)> CreateAsync(
        AuthHandoffPayload payload,
        CancellationToken cancellationToken = default)
    {
        var ttlSeconds = Math.Clamp(options.Value.TtlSeconds, 30, 300);
        var ttl = TimeSpan.FromSeconds(ttlSeconds);
        var code = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        var serialized = JsonSerializer.Serialize(payload, JsonOptions);

        var db = redis.GetDatabase();
        await db.StringSetAsync(GetKey(code), serialized, ttl);

        return (code, ttlSeconds);
    }

    public async Task<AuthHandoffPayload?> ExchangeAsync(
        string code,
        Guid expectedTenantId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return null;
        }

        var db = redis.GetDatabase();
        var key = GetKey(code.Trim());
        var ttl = await db.KeyTimeToLiveAsync(key);
        if (ttl is null || ttl <= TimeSpan.Zero)
        {
            return null;
        }

        var value = await db.StringGetDeleteAsync(key);
        if (value.IsNullOrEmpty)
        {
            return null;
        }

        AuthHandoffPayload? payload;
        try
        {
            payload = JsonSerializer.Deserialize<AuthHandoffPayload>(value.ToString(), JsonOptions);
        }
        catch (JsonException)
        {
            await db.StringSetAsync(key, value, ttl.Value);
            return null;
        }

        if (payload is null
            || payload.TenantId == Guid.Empty
            || payload.TenantId != expectedTenantId)
        {
            await db.StringSetAsync(key, value, ttl.Value);
            return null;
        }

        return payload;
    }

    private static string GetKey(string code) => KeyPrefix + code;
}
