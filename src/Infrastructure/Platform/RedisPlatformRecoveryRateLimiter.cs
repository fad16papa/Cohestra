using Cohestra.Application.Platform;
using Cohestra.Infrastructure.RateLimiting;
using Cohestra.Infrastructure.Registrations;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Platform;

public sealed class RedisPlatformRecoveryRateLimiter(
    IConnectionMultiplexer redis,
    IOptions<PlatformRecoveryRateLimitOptions> options) : IPlatformRecoveryRateLimiter
{
    internal const string LimiterName = "PlatformRecovery";

    private static readonly LuaScript ReserveScript = LuaScript.Prepare("""
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

    public Task<bool> TryConsumeAsync(Guid actorUserId, CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        if (settings.MaxActionsPerWindow <= 0 || settings.WindowMinutes <= 0)
        {
            return Task.FromResult(true);
        }

        var db = redis.GetDatabase();
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var windowMs = TimeSpan.FromMinutes(Math.Clamp(settings.WindowMinutes, 1, 1440)).TotalMilliseconds;
        var key = BuildKey(actorUserId);
        var member = Guid.NewGuid().ToString("N");

        return RedisRateLimiterOperations.EvaluateAllowAsync(
            () => ReserveScript.EvaluateAsync(db, new
            {
                key,
                now,
                windowMs,
                limit = settings.MaxActionsPerWindow,
                member,
            }),
            LimiterName);
    }

    internal static RedisKey BuildKey(Guid actorUserId)
    {
        var actorHash = RedisPublicRegistrationRateLimiter.HashIdentifier(actorUserId.ToString("D"));
        return $"platform:recovery:actor:{actorHash}";
    }
}
