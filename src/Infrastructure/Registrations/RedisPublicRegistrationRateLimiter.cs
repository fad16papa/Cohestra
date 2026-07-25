using System.Security.Cryptography;
using System.Text;
using Cohestra.Application.Registrations;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Registrations;

public sealed class RedisPublicRegistrationRateLimiter(
    IConnectionMultiplexer redis,
    IOptions<PublicRegistrationRateLimitOptions> options) : IPublicRegistrationRateLimiter
{
    private static readonly LuaScript SlidingWindowScript = LuaScript.Prepare("""
        local now = tonumber(@now)
        local windowMs = tonumber(@windowMs)
        local limit = tonumber(@limit)
        local member = @member

        redis.call('ZREMRANGEBYSCORE', @key, 0, now - windowMs)
        local count = redis.call('ZCARD', @key)
        if count >= limit then
            return 0
        end

        redis.call('ZADD', @key, now, member)
        redis.call('PEXPIRE', @key, windowMs)
        return 1
        """);

    public async Task<bool> AllowRequestAsync(
        Guid tenantId,
        string clientIdentifier,
        CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        if (settings.MaxRequests <= 0 || settings.WindowSeconds <= 0)
        {
            return true;
        }

        var db = redis.GetDatabase();
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var windowMs = settings.WindowSeconds * 1000L;
        var key = (RedisKey)TenantRedisKeys.PublicRegistrationRateLimit(
            tenantId,
            HashIdentifier(clientIdentifier));
        var member = Guid.NewGuid().ToString("N");

        var result = await SlidingWindowScript.EvaluateAsync(db, new
        {
            key,
            now,
            windowMs,
            limit = settings.MaxRequests,
            member,
        });

        return result is not null && (int)result == 1;
    }

    internal static string HashIdentifier(string value)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(hash);
    }
}
