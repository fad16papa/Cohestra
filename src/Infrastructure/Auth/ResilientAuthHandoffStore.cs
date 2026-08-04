using Cohestra.Application.Auth;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Auth;

/// <summary>
/// Prefer Redis for auth handoff; fall back to in-memory storage in Development when Redis fails.
/// </summary>
public sealed class ResilientAuthHandoffStore(
    RedisAuthHandoffStore redisStore,
    InMemoryAuthHandoffStore memoryStore,
    ILogger<ResilientAuthHandoffStore> logger) : IAuthHandoffStore
{
    public async Task<(string Code, int ExpiresInSeconds)> CreateAsync(
        AuthHandoffPayload payload,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await redisStore.CreateAsync(payload, cancellationToken);
        }
        catch (Exception ex) when (IsRedisFailure(ex))
        {
            logger.LogWarning(
                ex,
                "Redis auth handoff create failed; using in-memory fallback for tenant {TenantSlug}.",
                payload.TenantSlug);
            return await memoryStore.CreateAsync(payload, cancellationToken);
        }
    }

    public async Task<AuthHandoffPayload?> ExchangeAsync(
        string code,
        Guid expectedTenantId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var fromRedis = await redisStore.ExchangeAsync(code, expectedTenantId, cancellationToken);
            if (fromRedis is not null)
            {
                return fromRedis;
            }
        }
        catch (Exception ex) when (IsRedisFailure(ex))
        {
            logger.LogWarning(ex, "Redis auth handoff exchange failed; trying in-memory fallback.");
        }

        return await memoryStore.ExchangeAsync(code, expectedTenantId, cancellationToken);
    }

    private static bool IsRedisFailure(Exception exception) =>
        exception is RedisException
        or RedisConnectionException
        or RedisTimeoutException
        or TimeoutException;
}
