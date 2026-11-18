using System.Security.Cryptography;
using System.Text;
using Cohestra.Application.Auth;
using Cohestra.Application.RateLimiting;
using Cohestra.Infrastructure.RateLimiting;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Auth;

public sealed class RedisOtpStore(
    IConnectionMultiplexer redis,
    IOptions<JwtSettings> jwtOptions) : IAuthOtpStore
{
    private const string ComponentName = "AuthOtpStore";
    private const string CodeKeyPrefix = "auth:otp:code:";
    private const string RateKeyPrefix = "auth:otp:rate:";

    private const string FailKeyPrefix = "auth:otp:fail:";
    private const string ConsumeScript = """
        local value = redis.call('GET', KEYS[1])
        if not value then
          return 0
        end
        if value == ARGV[1] then
          redis.call('DEL', KEYS[1])
          return 1
        end
        return 2
        """;

    public Task<bool> TryStoreAsync(
        string email,
        OtpPurpose purpose,
        string code,
        TimeSpan ttl,
        CancellationToken cancellationToken = default,
        string? bindingScope = null) =>
        RedisRateLimiterOperations.ExecuteAsync(async () =>
        {
            var db = redis.GetDatabase();
            return await db.StringSetAsync(
                GetCodeKey(email, purpose, bindingScope),
                HashCode(email, purpose, code, bindingScope),
                ttl,
                When.Always);
        }, ComponentName);

    public Task<bool> ValidateAndConsumeAsync(
        string email,
        OtpPurpose purpose,
        string code,
        CancellationToken cancellationToken = default,
        string? bindingScope = null) =>
        RedisRateLimiterOperations.ExecuteAsync(async () =>
        {
            var db = redis.GetDatabase();
            var key = GetCodeKey(email, purpose, bindingScope);
            var expected = HashCode(email, purpose, code, bindingScope);
            var result = (int)await db.ScriptEvaluateAsync(
                ConsumeScript,
                [(RedisKey)key],
                [(RedisValue)expected]);
            return result == 1;
        }, ComponentName);

    public Task<bool> TryRecordSendAttemptAsync(
        string email,
        OtpPurpose purpose,
        int maxAttempts,
        TimeSpan window,
        CancellationToken cancellationToken = default,
        string? bindingScope = null) =>
        RedisRateLimiterOperations.ExecuteAsync(async () =>
        {
            var db = redis.GetDatabase();
            var key = GetRateKey(email, purpose, bindingScope);
            var count = await db.StringIncrementAsync(key);

            if (count == 1)
            {
                await db.KeyExpireAsync(key, window);
            }

            return count <= maxAttempts;
        }, ComponentName);

    public Task RemoveAsync(
        string email,
        OtpPurpose purpose,
        CancellationToken cancellationToken = default,
        string? bindingScope = null) =>
        RedisRateLimiterOperations.ExecuteAsync(async () =>
        {
            var db = redis.GetDatabase();
            await db.KeyDeleteAsync(GetCodeKey(email, purpose, bindingScope));
            return true;
        }, ComponentName);

    public Task<bool> TryRecordFailedVerificationAsync(
        string email,
        OtpPurpose purpose,
        int maxFailures,
        CancellationToken cancellationToken = default,
        string? bindingScope = null) =>
        RedisRateLimiterOperations.ExecuteAsync(async () =>
        {
            var db = redis.GetDatabase();
            var key = GetFailKey(email, purpose, bindingScope);
            var count = await db.StringIncrementAsync(key);
            if (count == 1)
            {
                await db.KeyExpireAsync(key, TimeSpan.FromMinutes(15));
            }

            if (count <= maxFailures)
            {
                return true;
            }

            await db.KeyDeleteAsync(GetCodeKey(email, purpose, bindingScope));
            return false;
        }, ComponentName);

    private string HashCode(string email, OtpPurpose purpose, string code, string? bindingScope)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var scope = NormalizeScope(bindingScope);
        var payload = string.IsNullOrEmpty(scope)
            ? $"{normalizedEmail}:{purpose}:{code.Trim()}"
            : $"{normalizedEmail}:{purpose}:{scope}:{code.Trim()}";
        var keyBytes = Encoding.UTF8.GetBytes(jwtOptions.Value.SigningKey);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var hash = HMACSHA256.HashData(keyBytes, payloadBytes);
        return Convert.ToHexString(hash);
    }

    private static string GetCodeKey(string email, OtpPurpose purpose, string? bindingScope) =>
        AppendScope(CodeKeyPrefix + NormalizeEmail(email) + ":" + purpose, bindingScope);

    private static string GetRateKey(string email, OtpPurpose purpose, string? bindingScope) =>
        AppendScope(RateKeyPrefix + NormalizeEmail(email) + ":" + purpose, bindingScope);

    private static string GetFailKey(string email, OtpPurpose purpose, string? bindingScope) =>
        AppendScope(FailKeyPrefix + NormalizeEmail(email) + ":" + purpose, bindingScope);

    private static string AppendScope(string key, string? bindingScope)
    {
        var scope = NormalizeScope(bindingScope);
        return string.IsNullOrEmpty(scope) ? key : key + ":" + scope;
    }

    private static string NormalizeScope(string? bindingScope)
    {
        if (string.IsNullOrWhiteSpace(bindingScope))
        {
            return string.Empty;
        }

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(bindingScope.Trim()));
        return Convert.ToHexString(hash);
    }

    private static string NormalizeEmail(string email)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(email.Trim().ToLowerInvariant()));
        return Convert.ToHexString(hash);
    }
}
