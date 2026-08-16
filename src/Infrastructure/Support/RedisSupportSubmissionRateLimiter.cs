using Cohestra.Application.Support;
using Cohestra.Infrastructure.RateLimiting;
using Cohestra.Infrastructure.Registrations;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Support;

public sealed class RedisSupportSubmissionRateLimiter(
    IConnectionMultiplexer redis,
    IOptions<SupportSubmissionRateLimitOptions> options) : ISupportSubmissionRateLimiter
{
    private const string LimiterName = "SupportSubmission";
    private static readonly LuaScript CheckScript = LuaScript.Prepare("""
        local now = tonumber(@now)
        local windowMs = tonumber(@windowMs)
        local limit = tonumber(@limit)

        redis.call('ZREMRANGEBYSCORE', @key, 0, now - windowMs)
        local count = redis.call('ZCARD', @key)
        if count >= limit then
            return 0
        end

        return 1
        """);

    private static readonly LuaScript RecordScript = LuaScript.Prepare("""
        local now = tonumber(@now)
        local windowMs = tonumber(@windowMs)
        local member = @member

        redis.call('ZREMRANGEBYSCORE', @key, 0, now - windowMs)
        redis.call('ZADD', @key, now, member)
        redis.call('PEXPIRE', @key, windowMs)
        return 1
        """);

    public async Task<bool> IsSubmissionAllowedAsync(
        Guid tenantId,
        Guid operatorUserId,
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
        var key = BuildKey(tenantId, operatorUserId);

        return await RedisRateLimiterOperations.EvaluateAllowAsync(
            () => CheckScript.EvaluateAsync(db, new
            {
                key,
                now,
                windowMs,
                limit = settings.MaxSubmissions,
            }),
            LimiterName);
    }

    public async Task RecordSuccessfulSubmissionAsync(
        Guid tenantId,
        Guid operatorUserId,
        CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        if (settings.MaxSubmissions <= 0 || settings.WindowSeconds <= 0)
        {
            return;
        }

        var db = redis.GetDatabase();
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var windowMs = settings.WindowSeconds * 1000L;
        var key = BuildKey(tenantId, operatorUserId);
        var member = Guid.NewGuid().ToString("N");

        await RedisRateLimiterOperations.ExecuteAsync(
            () => RecordScript.EvaluateAsync(db, new
            {
                key,
                now,
                windowMs,
                member,
            }),
            LimiterName);
    }

    private static RedisKey BuildKey(Guid tenantId, Guid operatorUserId)
    {
        var operatorHash = RedisPublicRegistrationRateLimiter.HashIdentifier(operatorUserId.ToString("D"));
        return $"tenant:{tenantId:D}:ratelimit:support-submit:{operatorHash}";
    }
}
