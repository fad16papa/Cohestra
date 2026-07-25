using System.Security.Cryptography;
using System.Text;
using Cohestra.Application.Signup;
using Cohestra.Infrastructure.Registrations;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Signup;

public sealed class RedisPublicSignupRateLimiter(
    IConnectionMultiplexer redis,
    IOptions<PublicSignupRateLimitOptions> options) : IPublicSignupRateLimiter
{
    private static readonly LuaScript CountScript = LuaScript.Prepare("""
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

        redis.call('ZADD', @key, now, member)
        redis.call('ZREMRANGEBYSCORE', @key, 0, now - windowMs)
        redis.call('PEXPIRE', @key, windowMs)
        return 1
        """);

    public async Task<bool> AllowSignupAsync(string clientIdentifier, CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        if (settings.MaxSuccessfulPerHour <= 0 && settings.MaxSuccessfulPerDay <= 0)
        {
            return true;
        }

        var hash = RedisPublicRegistrationRateLimiter.HashIdentifier(clientIdentifier);
        var db = redis.GetDatabase();
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        if (settings.MaxSuccessfulPerHour > 0)
        {
            var hourKey = (RedisKey)$"signup:success:ip:{hash}:hour";
            var hourAllowed = await EvaluateAllowAsync(
                db,
                hourKey,
                now,
                TimeSpan.FromHours(1),
                settings.MaxSuccessfulPerHour);

            if (!hourAllowed)
            {
                return false;
            }
        }

        if (settings.MaxSuccessfulPerDay > 0)
        {
            var dayKey = (RedisKey)$"signup:success:ip:{hash}:day";
            return await EvaluateAllowAsync(
                db,
                dayKey,
                now,
                TimeSpan.FromDays(1),
                settings.MaxSuccessfulPerDay);
        }

        return true;
    }

    public async Task RecordSuccessfulSignupAsync(string clientIdentifier, CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        var hash = RedisPublicRegistrationRateLimiter.HashIdentifier(clientIdentifier);
        var db = redis.GetDatabase();
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var member = Guid.NewGuid().ToString("N");

        if (settings.MaxSuccessfulPerHour > 0)
        {
            await RecordAsync(db, (RedisKey)$"signup:success:ip:{hash}:hour", now, TimeSpan.FromHours(1), member);
        }

        if (settings.MaxSuccessfulPerDay > 0)
        {
            await RecordAsync(db, (RedisKey)$"signup:success:ip:{hash}:day", now, TimeSpan.FromDays(1), member);
        }
    }

    private static async Task<bool> EvaluateAllowAsync(
        IDatabase db,
        RedisKey key,
        long now,
        TimeSpan window,
        int limit)
    {
        var windowMs = (long)window.TotalMilliseconds;
        var result = await CountScript.EvaluateAsync(db, new
        {
            key,
            now,
            windowMs,
            limit,
        });

        return result is not null && (int)result == 1;
    }

    private static async Task RecordAsync(
        IDatabase db,
        RedisKey key,
        long now,
        TimeSpan window,
        string member)
    {
        var windowMs = (long)window.TotalMilliseconds;
        await RecordScript.EvaluateAsync(db, new
        {
            key,
            now,
            windowMs,
            member,
        });
    }
}
