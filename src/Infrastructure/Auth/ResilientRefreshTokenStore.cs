using Cohestra.Application.Auth;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Auth;

/// <summary>
/// Prefer Redis for refresh tokens. In-memory fallback is Development/Testing only.
/// Production stays fail-closed (HTTP 503) when Redis is unavailable.
/// </summary>
public sealed class ResilientRefreshTokenStore : IRefreshTokenStore
{
    private readonly IRefreshTokenStore _redisStore;
    private readonly IRefreshTokenStore _memoryStore;
    private readonly IHostEnvironment _hostEnvironment;
    private readonly ILogger<ResilientRefreshTokenStore> _logger;

    public ResilientRefreshTokenStore(
        RedisRefreshTokenStore redisStore,
        InMemoryRefreshTokenStore memoryStore,
        IHostEnvironment hostEnvironment,
        ILogger<ResilientRefreshTokenStore> logger)
        : this(redisStore, new InMemoryRefreshTokenStoreAdapter(memoryStore), hostEnvironment, logger)
    {
    }

    internal ResilientRefreshTokenStore(
        IRefreshTokenStore redisStore,
        IRefreshTokenStore memoryStore,
        IHostEnvironment hostEnvironment,
        ILogger<ResilientRefreshTokenStore> logger)
    {
        _redisStore = redisStore;
        _memoryStore = memoryStore;
        _hostEnvironment = hostEnvironment;
        _logger = logger;
    }

    public async Task StoreAsync(
        string refreshToken,
        Guid userId,
        Guid? tenantId,
        TimeSpan ttl,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _redisStore.StoreAsync(refreshToken, userId, tenantId, ttl, cancellationToken);
        }
        catch (Exception ex) when (IsRedisFailure(ex))
        {
            if (!AuthSessionStorePolicy.AllowsInMemoryFallback(_hostEnvironment))
            {
                throw new AuthSessionStoreUnavailableException("refresh-token", ex);
            }

            _logger.LogWarning(
                ex,
                "Redis refresh token store failed; using in-memory fallback for user {UserId}.",
                userId);
            await _memoryStore.StoreAsync(refreshToken, userId, tenantId, ttl, cancellationToken);
        }
    }

    public async Task<RefreshTokenSession?> GetSessionAsync(
        string refreshToken,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var fromRedis = await _redisStore.GetSessionAsync(refreshToken, cancellationToken);
            if (fromRedis is not null || !AuthSessionStorePolicy.AllowsInMemoryFallback(_hostEnvironment))
            {
                return fromRedis;
            }
        }
        catch (Exception ex) when (IsRedisFailure(ex))
        {
            if (!AuthSessionStorePolicy.AllowsInMemoryFallback(_hostEnvironment))
            {
                throw new AuthSessionStoreUnavailableException("refresh-token", ex);
            }

            _logger.LogWarning(ex, "Redis refresh token read failed; trying in-memory fallback.");
        }

        return await _memoryStore.GetSessionAsync(refreshToken, cancellationToken);
    }

    public async Task<RefreshTokenSession?> ConsumeAsync(
        string refreshToken,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var fromRedis = await _redisStore.ConsumeAsync(refreshToken, cancellationToken);
            if (fromRedis is not null || !AuthSessionStorePolicy.AllowsInMemoryFallback(_hostEnvironment))
            {
                return fromRedis;
            }
        }
        catch (Exception ex) when (IsRedisFailure(ex))
        {
            if (!AuthSessionStorePolicy.AllowsInMemoryFallback(_hostEnvironment))
            {
                throw new AuthSessionStoreUnavailableException("refresh-token", ex);
            }

            _logger.LogWarning(ex, "Redis refresh token consume failed; trying in-memory fallback.");
        }

        return await _memoryStore.ConsumeAsync(refreshToken, cancellationToken);
    }

    public async Task RevokeAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        try
        {
            await _redisStore.RevokeAsync(refreshToken, cancellationToken);
        }
        catch (Exception ex) when (IsRedisFailure(ex))
        {
            if (!AuthSessionStorePolicy.AllowsInMemoryFallback(_hostEnvironment))
            {
                throw new AuthSessionStoreUnavailableException("refresh-token", ex);
            }

            _logger.LogWarning(ex, "Redis refresh token revoke failed; trying in-memory fallback.");
        }

        if (AuthSessionStorePolicy.AllowsInMemoryFallback(_hostEnvironment))
        {
            await _memoryStore.RevokeAsync(refreshToken, cancellationToken);
        }
    }

    public async Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
            await _redisStore.RevokeAllForUserAsync(userId, cancellationToken);
        }
        catch (Exception ex) when (IsRedisFailure(ex))
        {
            if (!AuthSessionStorePolicy.AllowsInMemoryFallback(_hostEnvironment))
            {
                throw new AuthSessionStoreUnavailableException("refresh-token", ex);
            }

            _logger.LogWarning(
                ex,
                "Redis refresh token revoke-all failed; trying in-memory fallback for user {UserId}.",
                userId);
        }

        if (AuthSessionStorePolicy.AllowsInMemoryFallback(_hostEnvironment))
        {
            await _memoryStore.RevokeAllForUserAsync(userId, cancellationToken);
        }
    }

    private static bool IsRedisFailure(Exception exception) =>
        exception is RedisException
            or RedisConnectionException
            or RedisTimeoutException
            or TimeoutException;

    private sealed class InMemoryRefreshTokenStoreAdapter(InMemoryRefreshTokenStore inner) : IRefreshTokenStore
    {
        public Task StoreAsync(
            string refreshToken,
            Guid userId,
            Guid? tenantId,
            TimeSpan ttl,
            CancellationToken cancellationToken = default) =>
            inner.StoreAsync(refreshToken, userId, tenantId, ttl, cancellationToken);

        public Task<RefreshTokenSession?> GetSessionAsync(
            string refreshToken,
            CancellationToken cancellationToken = default) =>
            inner.GetSessionAsync(refreshToken, cancellationToken);

        public Task<RefreshTokenSession?> ConsumeAsync(
            string refreshToken,
            CancellationToken cancellationToken = default) =>
            inner.ConsumeAsync(refreshToken, cancellationToken);

        public Task RevokeAsync(string refreshToken, CancellationToken cancellationToken = default) =>
            inner.RevokeAsync(refreshToken, cancellationToken);

        public Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken = default) =>
            inner.RevokeAllForUserAsync(userId, cancellationToken);
    }
}
