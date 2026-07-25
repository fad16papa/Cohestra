using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Cohestra.Application.Registrations;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Registrations;

public sealed class RedisRegistrationIdempotencyStore(
    IConnectionMultiplexer redis,
    IOptions<RegistrationIdempotencyOptions> options) : IRegistrationIdempotencyStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<IdempotencyLookupResult> LookupAsync(
        Guid tenantId,
        string idempotencyKey,
        string requestFingerprint,
        CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        var payload = await db.StringGetAsync(GetResultKey(tenantId, idempotencyKey));

        if (payload.IsNullOrEmpty)
        {
            return IdempotencyLookupResult.Miss();
        }

        var entry = JsonSerializer.Deserialize<StoredEntry>(payload.ToString(), JsonOptions);
        if (entry is null)
        {
            return IdempotencyLookupResult.Miss();
        }

        if (!string.Equals(entry.RequestFingerprint, requestFingerprint, StringComparison.Ordinal))
        {
            return IdempotencyLookupResult.Conflict();
        }

        return IdempotencyLookupResult.Replay(
            new IdempotencyCachedRegistration(
                entry.RegistrationId,
                entry.RegistrationNumber,
                entry.ClientId));
    }

    public async Task<bool> TryBeginAsync(
        Guid tenantId,
        string idempotencyKey,
        string requestFingerprint,
        CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        var lockKey = GetLockKey(tenantId, idempotencyKey);
        var lockValue = requestFingerprint;
        var lockTtl = TimeSpan.FromSeconds(Math.Max(1, options.Value.LockSeconds));

        return await db.StringSetAsync(lockKey, lockValue, lockTtl, When.NotExists);
    }

    public async Task StoreAsync(
        Guid tenantId,
        string idempotencyKey,
        string requestFingerprint,
        IdempotencyCachedRegistration registration,
        CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        var entry = new StoredEntry
        {
            RequestFingerprint = requestFingerprint,
            RegistrationId = registration.RegistrationId,
            RegistrationNumber = registration.RegistrationNumber,
            ClientId = registration.ClientId,
        };

        var ttl = TimeSpan.FromHours(Math.Max(1, options.Value.ResultTtlHours));
        await db.StringSetAsync(
            GetResultKey(tenantId, idempotencyKey),
            JsonSerializer.Serialize(entry, JsonOptions),
            ttl);
    }

    public async Task ReleaseLockAsync(
        Guid tenantId,
        string idempotencyKey,
        CancellationToken cancellationToken = default)
    {
        var db = redis.GetDatabase();
        await db.KeyDeleteAsync(GetLockKey(tenantId, idempotencyKey));
    }

    internal static string ComputeRequestFingerprint(
        string activitySlug,
        IReadOnlyDictionary<string, object?> answers)
    {
        var builder = new StringBuilder();
        builder.Append(activitySlug.Trim());

        foreach (var pair in answers.OrderBy(item => item.Key, StringComparer.Ordinal))
        {
            builder.Append('|');
            builder.Append(pair.Key);
            builder.Append('=');
            builder.Append(NormalizeAnswerValue(pair.Value));
        }

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(builder.ToString()));
        return Convert.ToHexString(hash);
    }

    internal static string NormalizeIdempotencyKey(string idempotencyKey)
    {
        var trimmed = idempotencyKey.Trim();
        if (trimmed.Length is < 1 or > 128)
        {
            throw new ArgumentException("Idempotency-Key must be between 1 and 128 characters.");
        }

        return trimmed;
    }

    private static string GetResultKey(Guid tenantId, string idempotencyKey) =>
        TenantRedisKeys.PublicRegistrationIdempotency(tenantId, HashKey(idempotencyKey));

    private static string GetLockKey(Guid tenantId, string idempotencyKey) =>
        TenantRedisKeys.PublicRegistrationIdempotencyLock(tenantId, HashKey(idempotencyKey));

    private static string HashKey(string idempotencyKey)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(idempotencyKey.Trim()));
        return Convert.ToHexString(hash);
    }

    private static string NormalizeAnswerValue(object? value) =>
        value switch
        {
            null => string.Empty,
            bool boolValue => boolValue ? "true" : "false",
            JsonElement jsonElement => jsonElement.GetRawText(),
            _ => value.ToString() ?? string.Empty,
        };

    private sealed class StoredEntry
    {
        public required string RequestFingerprint { get; init; }

        public Guid RegistrationId { get; init; }

        public string RegistrationNumber { get; init; } = string.Empty;

        public Guid ClientId { get; init; }
    }
}
