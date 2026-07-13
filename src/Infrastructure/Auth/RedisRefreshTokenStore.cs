using System.Security.Cryptography;
using System.Text;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Auth;

public sealed class RedisRefreshTokenStore(IConnectionMultiplexer redis) : IRefreshTokenStore
{
    private const string KeyPrefix = "auth:refresh:";

    public async Task StoreAsync(string refreshToken, Guid userId, TimeSpan ttl, CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        await db.StringSetAsync(GetKey(refreshToken), userId.ToString(), ttl);
    }

    public async Task<Guid?> GetUserIdAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        var value = await db.StringGetAsync(GetKey(refreshToken));

        if (value.IsNullOrEmpty)
        {
            return null;
        }

        return Guid.TryParse(value.ToString(), out var userId) ? userId : null;
    }

    public async Task<Guid?> ConsumeAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        var value = await db.StringGetDeleteAsync(GetKey(refreshToken));

        if (value.IsNullOrEmpty)
        {
            return null;
        }

        return Guid.TryParse(value.ToString(), out var userId) ? userId : null;
    }

    public async Task RevokeAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        await db.KeyDeleteAsync(GetKey(refreshToken));
    }

    private static string GetKey(string refreshToken)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken));
        return KeyPrefix + Convert.ToHexString(hash);
    }
}
