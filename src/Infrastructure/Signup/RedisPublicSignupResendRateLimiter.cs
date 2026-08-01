using System.Security.Cryptography;
using System.Text;
using Cohestra.Application.Signup;
using Cohestra.Infrastructure.Registrations;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Signup;

public sealed class RedisPublicSignupResendRateLimiter(
    IConnectionMultiplexer redis,
    IOptions<PublicSignupResendRateLimitOptions> options) : IPublicSignupResendRateLimiter
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

    public async Task<bool> AllowResendAsync(
        string email,
        string? clientIdentifier,
        CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        if (settings.MaxResendsPerWindow <= 0)
        {
            return true;
        }

        var db = redis.GetDatabase();
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var window = TimeSpan.FromMinutes(Math.Clamp(settings.WindowMinutes, 1, 1440));

        if (!await EvaluateAllowAsync(
                db,
                BuildEmailKey(email),
                now,
                window,
                settings.MaxResendsPerWindow))
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(clientIdentifier))
        {
            return true;
        }

        return await EvaluateAllowAsync(
            db,
            BuildIpKey(clientIdentifier),
            now,
            window,
            settings.MaxResendsPerWindow);
    }

    public async Task RecordResendAsync(
        string email,
        string? clientIdentifier,
        CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        if (settings.MaxResendsPerWindow <= 0)
        {
            return;
        }

        var db = redis.GetDatabase();
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var window = TimeSpan.FromMinutes(Math.Clamp(settings.WindowMinutes, 1, 1440));
        var member = Guid.NewGuid().ToString("N");

        await RecordAsync(db, BuildEmailKey(email), now, window, member);

        if (!string.IsNullOrWhiteSpace(clientIdentifier))
        {
            await RecordAsync(db, BuildIpKey(clientIdentifier), now, window, member);
        }
    }

    private static RedisKey BuildEmailKey(string email)
    {
        var hash = HashNormalizedEmail(email);
        return (RedisKey)$"signup:resend:email:{hash}";
    }

    private static RedisKey BuildIpKey(string clientIdentifier)
    {
        var hash = RedisPublicRegistrationRateLimiter.HashIdentifier(clientIdentifier);
        return (RedisKey)$"signup:resend:ip:{hash}";
    }

    private static string HashNormalizedEmail(string email)
    {
        var normalized = email.Trim().ToLowerInvariant();
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
        return Convert.ToHexString(hash);
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
