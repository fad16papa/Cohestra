using Cohestra.Application.Support;
using Cohestra.Infrastructure.RateLimiting;
using Cohestra.Infrastructure.Registrations;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Support;

public sealed class RedisSupportSubmissionRateLimiter(
    IConnectionMultiplexer redis,
    IOptions<SupportSubmissionRateLimitOptions> options,
    ILogger<RedisSupportSubmissionRateLimiter> logger) : ISupportSubmissionRateLimiter
{
    private const string LimiterName = "SupportSubmission";
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

    private static readonly LuaScript ReleaseScript = LuaScript.Prepare("""
        redis.call('ZREM', @key, @member)
        return 1
        """);

    public async Task<SupportSubmissionReservation?> TryReserveSubmissionAsync(
        Guid tenantId,
        Guid operatorUserId,
        CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        if (settings.MaxSubmissions <= 0 || settings.WindowSeconds <= 0)
        {
            return new SupportSubmissionReservation(tenantId, operatorUserId, string.Empty);
        }

        var member = Guid.NewGuid().ToString("N");
        var db = redis.GetDatabase();
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var windowMs = settings.WindowSeconds * 1000L;
        var key = BuildKey(tenantId, operatorUserId);

        var allowed = await RedisRateLimiterOperations.EvaluateAllowAsync(
            () => ReserveScript.EvaluateAsync(db, new
            {
                key,
                now,
                windowMs,
                limit = settings.MaxSubmissions,
                member,
            }),
            LimiterName);

        return allowed
            ? new SupportSubmissionReservation(tenantId, operatorUserId, member)
            : null;
    }

    public async Task ReleaseSubmissionAsync(
        SupportSubmissionReservation reservation,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(reservation.Member))
        {
            return;
        }

        try
        {
            var db = redis.GetDatabase();
            var key = BuildKey(reservation.TenantId, reservation.OperatorUserId);

            await RedisRateLimiterOperations.ExecuteAsync(
                () => ReleaseScript.EvaluateAsync(db, new
                {
                    key,
                    member = reservation.Member,
                }),
                LimiterName);
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Could not release support submission rate-limit slot for operator {OperatorUserId}.",
                reservation.OperatorUserId);
        }
    }

    private static RedisKey BuildKey(Guid tenantId, Guid operatorUserId)
    {
        var operatorHash = RedisPublicRegistrationRateLimiter.HashIdentifier(operatorUserId.ToString("D"));
        return $"tenant:{tenantId:D}:ratelimit:support-submit:{operatorHash}";
    }
}
