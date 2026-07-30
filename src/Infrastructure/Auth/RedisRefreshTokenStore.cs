using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Auth;

public sealed class RedisRefreshTokenStore(IConnectionMultiplexer redis) : IRefreshTokenStore
{
    private const string KeyPrefix = "auth:refresh:";
    private const string UserIndexPrefix = "auth:refresh:user:";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task StoreAsync(
        string refreshToken,
        Guid userId,
        Guid? tenantId,
        TimeSpan ttl,
        CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        var payload = JsonSerializer.Serialize(
            new RefreshTokenPayload(userId, tenantId),
            JsonOptions);
        await db.StringSetAsync(GetKey(refreshToken), payload, ttl);
        await db.SetAddAsync(GetUserIndexKey(userId), GetKey(refreshToken));
        await db.KeyExpireAsync(GetUserIndexKey(userId), ttl);
    }

    public async Task<RefreshTokenSession?> GetSessionAsync(
        string refreshToken,
        CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        var value = await db.StringGetAsync(GetKey(refreshToken));
        return ParseSession(value);
    }

    public async Task<RefreshTokenSession?> ConsumeAsync(
        string refreshToken,
        CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        var value = await db.StringGetDeleteAsync(GetKey(refreshToken));
        var session = ParseSession(value);
        if (session is not null)
        {
            await db.SetRemoveAsync(GetUserIndexKey(session.UserId), GetKey(refreshToken));
        }

        return session;
    }

    public async Task RevokeAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        var key = GetKey(refreshToken);
        var session = await GetSessionAsync(refreshToken, cancellationToken);
        await db.KeyDeleteAsync(key);
        if (session is not null)
        {
            await db.SetRemoveAsync(GetUserIndexKey(session.UserId), key);
        }
    }

    public async Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        var indexKey = GetUserIndexKey(userId);
        var members = await db.SetMembersAsync(indexKey);
        if (members.Length == 0)
        {
            return;
        }

        var keys = members.Select(m => (RedisKey)m.ToString()).ToArray();
        keys = keys.Append(indexKey).ToArray();
        await db.KeyDeleteAsync(keys);
    }

    private static RedisKey GetUserIndexKey(Guid userId) => (RedisKey)$"{UserIndexPrefix}{userId:N}";

    private static RefreshTokenSession? ParseSession(RedisValue value)
    {
        if (value.IsNullOrEmpty)
        {
            return null;
        }

        var raw = value.ToString();

        // Legacy: plain userId Guid (pre-12.2)
        if (Guid.TryParse(raw, out var legacyUserId))
        {
            return new RefreshTokenSession(legacyUserId, null);
        }

        try
        {
            var payload = JsonSerializer.Deserialize<RefreshTokenPayload>(raw, JsonOptions);
            if (payload is null || payload.UserId == Guid.Empty)
            {
                return null;
            }

            return new RefreshTokenSession(payload.UserId, payload.TenantId);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string GetKey(string refreshToken)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken));
        return KeyPrefix + Convert.ToHexString(hash);
    }

    private sealed record RefreshTokenPayload(Guid UserId, Guid? TenantId);
}
