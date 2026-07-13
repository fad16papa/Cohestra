using System.Security.Cryptography;
using System.Text;
using LeadGenerationCrm.Application.Auth;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace LeadGenerationCrm.Infrastructure.Auth;

public sealed class RedisOtpStore(
    IConnectionMultiplexer redis,
    IOptions<JwtSettings> jwtOptions) : IAuthOtpStore
{
    private const string CodeKeyPrefix = "auth:otp:code:";
    private const string RateKeyPrefix = "auth:otp:rate:";

    public async Task<bool> TryStoreAsync(
        string email,
        OtpPurpose purpose,
        string code,
        TimeSpan ttl,
        CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        return await db.StringSetAsync(
            GetCodeKey(email, purpose),
            HashCode(email, purpose, code),
            ttl,
            When.Always);
    }

    public async Task<bool> ValidateAndConsumeAsync(
        string email,
        OtpPurpose purpose,
        string code,
        CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        var key = GetCodeKey(email, purpose);
        var stored = await db.StringGetAsync(key);

        if (stored.IsNullOrEmpty)
        {
            return false;
        }

        var expected = HashCode(email, purpose, code.Trim());
        var storedValue = stored.ToString();
        if (storedValue.Length != expected.Length
            || !CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(storedValue),
                Encoding.UTF8.GetBytes(expected)))
        {
            return false;
        }

        await db.KeyDeleteAsync(key);
        return true;
    }

    public async Task<bool> TryRecordSendAttemptAsync(
        string email,
        OtpPurpose purpose,
        int maxAttempts,
        TimeSpan window,
        CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        var key = GetRateKey(email, purpose);
        var count = await db.StringIncrementAsync(key);

        if (count == 1)
        {
            await db.KeyExpireAsync(key, window);
        }

        return count <= maxAttempts;
    }

    private string HashCode(string email, OtpPurpose purpose, string code)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var payload = $"{normalizedEmail}:{purpose}:{code.Trim()}";
        var keyBytes = Encoding.UTF8.GetBytes(jwtOptions.Value.SigningKey);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var hash = HMACSHA256.HashData(keyBytes, payloadBytes);
        return Convert.ToHexString(hash);
    }

    private static string GetCodeKey(string email, OtpPurpose purpose) =>
        CodeKeyPrefix + NormalizeEmail(email) + ":" + purpose;

    private static string GetRateKey(string email, OtpPurpose purpose) =>
        RateKeyPrefix + NormalizeEmail(email) + ":" + purpose;

    private static string NormalizeEmail(string email)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(email.Trim().ToLowerInvariant()));
        return Convert.ToHexString(hash);
    }
}
