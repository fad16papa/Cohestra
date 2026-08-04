using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Auth;

/// <summary>
/// Prefer Redis for refresh tokens; fall back to in-memory storage in Development when Redis fails.
/// </summary>
public sealed class ResilientRefreshTokenStore(
    RedisRefreshTokenStore redisStore,
    InMemoryRefreshTokenStore memoryStore,
    ILogger<ResilientRefreshTokenStore> logger) : IRefreshTokenStore
{
    public async Task StoreAsync(
        string refreshToken,
        Guid userId,
        Guid? tenantId,
        TimeSpan ttl,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await redisStore.StoreAsync(refreshToken, userId, tenantId, ttl, cancellationToken);
        }
        catch (Exception ex) when (IsRedisFailure(ex))
        {
            logger.LogWarning(
                ex,
                "Redis refresh token store failed; using in-memory fallback for user {UserId}.",
                userId);
            await memoryStore.StoreAsync(refreshToken, userId, tenantId, ttl, cancellationToken);
        }
    }

    public async Task<RefreshTokenSession?> GetSessionAsync(
        string refreshToken,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var fromRedis = await redisStore.GetSessionAsync(refreshToken, cancellationToken);
            if (fromRedis is not null)
            {
                return fromRedis;
            }
        }
        catch (Exception ex) when (IsRedisFailure(ex))
        {
            logger.LogWarning(ex, "Redis refresh token read failed; trying in-memory fallback.");
        }

        return await memoryStore.GetSessionAsync(refreshToken, cancellationToken);
    }

    public async Task<RefreshTokenSession?> ConsumeAsync(
        string refreshToken,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var fromRedis = await redisStore.ConsumeAsync(refreshToken, cancellationToken);
            if (fromRedis is not null)
            {
                return fromRedis;
            }
        }
        catch (Exception ex) when (IsRedisFailure(ex))
        {
            logger.LogWarning(ex, "Redis refresh token consume failed; trying in-memory fallback.");
        }

        return await memoryStore.ConsumeAsync(refreshToken, cancellationToken);
    }

    public async Task RevokeAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        try
        {
            await redisStore.RevokeAsync(refreshToken, cancellationToken);
        }
        catch (Exception ex) when (IsRedisFailure(ex))
        {
            logger.LogWarning(ex, "Redis refresh token revoke failed; trying in-memory fallback.");
        }

        await memoryStore.RevokeAsync(refreshToken, cancellationToken);
    }

    public async Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
            await redisStore.RevokeAllForUserAsync(userId, cancellationToken);
        }
        catch (Exception ex) when (IsRedisFailure(ex))
        {
            logger.LogWarning(
                ex,
                "Redis refresh token revoke-all failed; trying in-memory fallback for user {UserId}.",
                userId);
        }

        await memoryStore.RevokeAllForUserAsync(userId, cancellationToken);
    }

    private static bool IsRedisFailure(Exception exception) =>
        exception is RedisException
        or RedisConnectionException
        or RedisTimeoutException
        or TimeoutException;
}
