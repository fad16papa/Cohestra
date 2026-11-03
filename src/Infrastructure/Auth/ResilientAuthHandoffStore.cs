using Cohestra.Application.Auth;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Auth;

/// <summary>
/// Prefer Redis for auth handoff. In-memory fallback is Development/Testing only.
/// Production stays fail-closed (HTTP 503) when Redis is unavailable.
/// </summary>
public sealed class ResilientAuthHandoffStore : IAuthHandoffStore
{
    private readonly IAuthHandoffStore _redisStore;
    private readonly InMemoryAuthHandoffStore _memoryStore;
    private readonly IHostEnvironment _hostEnvironment;
    private readonly ILogger<ResilientAuthHandoffStore> _logger;

    public ResilientAuthHandoffStore(
        RedisAuthHandoffStore redisStore,
        InMemoryAuthHandoffStore memoryStore,
        IHostEnvironment hostEnvironment,
        ILogger<ResilientAuthHandoffStore> logger)
        : this((IAuthHandoffStore)redisStore, memoryStore, hostEnvironment, logger)
    {
    }

    internal ResilientAuthHandoffStore(
        IAuthHandoffStore redisStore,
        InMemoryAuthHandoffStore memoryStore,
        IHostEnvironment hostEnvironment,
        ILogger<ResilientAuthHandoffStore> logger)
    {
        _redisStore = redisStore;
        _memoryStore = memoryStore;
        _hostEnvironment = hostEnvironment;
        _logger = logger;
    }

    public async Task<(string Code, int ExpiresInSeconds)> CreateAsync(
        AuthHandoffPayload payload,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await _redisStore.CreateAsync(payload, cancellationToken);
        }
        catch (Exception ex) when (IsRedisFailure(ex))
        {
            if (!AuthSessionStorePolicy.AllowsInMemoryFallback(_hostEnvironment))
            {
                throw new AuthSessionStoreUnavailableException("auth-handoff", ex);
            }

            _logger.LogWarning(
                ex,
                "Redis auth handoff create failed; using in-memory fallback for tenant {TenantSlug}.",
                payload.TenantSlug);
            return await _memoryStore.CreateAsync(payload, cancellationToken);
        }
    }

    public async Task<AuthHandoffPayload?> ExchangeAsync(
        string code,
        Guid? expectedTenantId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var fromRedis = await _redisStore.ExchangeAsync(code, expectedTenantId, cancellationToken);
            if (fromRedis is not null || !AuthSessionStorePolicy.AllowsInMemoryFallback(_hostEnvironment))
            {
                return fromRedis;
            }
        }
        catch (Exception ex) when (IsRedisFailure(ex))
        {
            if (!AuthSessionStorePolicy.AllowsInMemoryFallback(_hostEnvironment))
            {
                throw new AuthSessionStoreUnavailableException("auth-handoff", ex);
            }

            _logger.LogWarning(ex, "Redis auth handoff exchange failed; trying in-memory fallback.");
        }

        return await _memoryStore.ExchangeAsync(code, expectedTenantId, cancellationToken);
    }

    private static bool IsRedisFailure(Exception exception) =>
        exception is RedisException
            or RedisConnectionException
            or RedisTimeoutException
            or TimeoutException;
}
