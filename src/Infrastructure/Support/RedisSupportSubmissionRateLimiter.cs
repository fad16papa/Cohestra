using Cohestra.Application.Support;
using Cohestra.Infrastructure.RateLimiting;
using Cohestra.Infrastructure.Registrations;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Support;

public sealed class RedisSupportSubmissionRateLimiter(
    IConnectionMultiplexer redis,
    IOptions<SupportSubmissionRateLimitOptions> options) : ISupportSubmissionRateLimiter
{
    private const string LimiterName = "SupportSubmission";
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

    public async Task<bool> AllowSubmissionAsync(
        Guid tenantId,
        Guid operatorUserId,
        string clientIdentifier,
        CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        if (settings.MaxSubmissions <= 0 || settings.WindowSeconds <= 0)
        {
            return true;
        }

        var db = redis.GetDatabase();
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var windowMs = settings.WindowSeconds * 1000L;
        var operatorHash = RedisPublicRegistrationRateLimiter.HashIdentifier(operatorUserId.ToString("D"));
        var clientHash = RedisPublicRegistrationRateLimiter.HashIdentifier(clientIdentifier);
        var key = (RedisKey)$"tenant:{tenantId:D}:ratelimit:support-submit:{operatorHash}:{clientHash}";
        var member = Guid.NewGuid().ToString("N");

        return await RedisRateLimiterOperations.EvaluateAllowAsync(
            () => SlidingWindowScript.EvaluateAsync(db, new
            {
                key,
                now,
                windowMs,
                limit = settings.MaxSubmissions,
                member,
            }),
            LimiterName);
    }
}
