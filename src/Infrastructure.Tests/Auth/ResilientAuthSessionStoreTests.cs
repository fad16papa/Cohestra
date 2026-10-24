using Cohestra.Application.Auth;
using Cohestra.Infrastructure.Auth;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class ResilientAuthSessionStoreTests
{
    [Theory]
    [InlineData("Development", true)]
    [InlineData("Testing", true)]
    [InlineData("Production", false)]
    [InlineData("Staging", false)]
    public void In_memory_fallback_is_restricted_to_development_and_testing(
        string environmentName,
        bool expected)
    {
        Assert.Equal(expected, AuthSessionStorePolicy.AllowsInMemoryFallback(new StubHostEnvironment(environmentName)));
    }

    [Fact]
    public async Task Production_refresh_store_fails_closed_on_redis_fault()
    {
        var store = new ResilientRefreshTokenStore(
            new ThrowingRefreshTokenStore(),
            new RecordingRefreshTokenStore(),
            new StubHostEnvironment(Environments.Production),
            NullLogger<ResilientRefreshTokenStore>.Instance);

        var exception = await Assert.ThrowsAsync<AuthSessionStoreUnavailableException>(() =>
            store.StoreAsync("token", Guid.NewGuid(), Guid.NewGuid(), TimeSpan.FromMinutes(5)));

        Assert.Equal("refresh-token", exception.StoreName);
    }

    [Fact]
    public async Task Production_refresh_store_does_not_read_in_memory_after_redis_miss()
    {
        var memory = new RecordingRefreshTokenStore();
        var store = new ResilientRefreshTokenStore(
            new EmptyRefreshTokenStore(),
            memory,
            new StubHostEnvironment(Environments.Production),
            NullLogger<ResilientRefreshTokenStore>.Instance);

        var session = await store.GetSessionAsync("missing");

        Assert.Null(session);
        Assert.False(memory.GetCalled);
    }

    [Fact]
    public async Task Development_refresh_store_falls_back_to_memory_on_redis_fault()
    {
        var userId = Guid.NewGuid();
        var memory = new RecordingRefreshTokenStore();
        var store = new ResilientRefreshTokenStore(
            new ThrowingRefreshTokenStore(),
            memory,
            new StubHostEnvironment(Environments.Development),
            NullLogger<ResilientRefreshTokenStore>.Instance);

        await store.StoreAsync("token", userId, tenantId: null, TimeSpan.FromMinutes(5));

        Assert.True(memory.StoreCalled);
        var session = await store.GetSessionAsync("token");
        Assert.Equal(userId, session?.UserId);
    }

    [Fact]
    public async Task Production_handoff_store_fails_closed_on_redis_fault()
    {
        var store = new ResilientAuthHandoffStore(
            new ThrowingAuthHandoffStore(),
            new InMemoryAuthHandoffStore(Options.Create(new AuthHandoffOptions())),
            new StubHostEnvironment(Environments.Production),
            NullLogger<ResilientAuthHandoffStore>.Instance);

        var payload = new AuthHandoffPayload(
            Guid.NewGuid(),
            "acme",
            "access",
            "refresh",
            120);

        var exception = await Assert.ThrowsAsync<AuthSessionStoreUnavailableException>(() =>
            store.CreateAsync(payload));

        Assert.Equal("auth-handoff", exception.StoreName);
    }

    private sealed class ThrowingRefreshTokenStore : IRefreshTokenStore
    {
        public Task StoreAsync(
            string refreshToken,
            Guid userId,
            Guid? tenantId,
            TimeSpan ttl,
            CancellationToken cancellationToken = default) =>
            throw new RedisException("simulated outage");

        public Task<RefreshTokenSession?> GetSessionAsync(
            string refreshToken,
            CancellationToken cancellationToken = default) =>
            throw new RedisException("simulated outage");

        public Task<RefreshTokenSession?> ConsumeAsync(
            string refreshToken,
            CancellationToken cancellationToken = default) =>
            throw new RedisException("simulated outage");

        public Task RevokeAsync(string refreshToken, CancellationToken cancellationToken = default) =>
            throw new RedisException("simulated outage");

        public Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken = default) =>
            throw new RedisException("simulated outage");
    }

    private sealed class EmptyRefreshTokenStore : IRefreshTokenStore
    {
        public Task StoreAsync(
            string refreshToken,
            Guid userId,
            Guid? tenantId,
            TimeSpan ttl,
            CancellationToken cancellationToken = default) =>
            Task.CompletedTask;

        public Task<RefreshTokenSession?> GetSessionAsync(
            string refreshToken,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<RefreshTokenSession?>(null);

        public Task<RefreshTokenSession?> ConsumeAsync(
            string refreshToken,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<RefreshTokenSession?>(null);

        public Task RevokeAsync(string refreshToken, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;

        public Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }

    private sealed class RecordingRefreshTokenStore : IRefreshTokenStore
    {
        private readonly Dictionary<string, RefreshTokenSession> _sessions = new(StringComparer.Ordinal);

        public bool StoreCalled { get; private set; }

        public bool GetCalled { get; private set; }

        public Task StoreAsync(
            string refreshToken,
            Guid userId,
            Guid? tenantId,
            TimeSpan ttl,
            CancellationToken cancellationToken = default)
        {
            StoreCalled = true;
            _sessions[refreshToken] = new RefreshTokenSession(userId, tenantId);
            return Task.CompletedTask;
        }

        public Task<RefreshTokenSession?> GetSessionAsync(
            string refreshToken,
            CancellationToken cancellationToken = default)
        {
            GetCalled = true;
            return Task.FromResult(_sessions.TryGetValue(refreshToken, out var session) ? session : null);
        }

        public Task<RefreshTokenSession?> ConsumeAsync(
            string refreshToken,
            CancellationToken cancellationToken = default)
        {
            var found = _sessions.Remove(refreshToken, out var session);
            return Task.FromResult(found ? session : null);
        }

        public Task RevokeAsync(string refreshToken, CancellationToken cancellationToken = default)
        {
            _sessions.Remove(refreshToken);
            return Task.CompletedTask;
        }

        public Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            foreach (var key in _sessions.Where(pair => pair.Value.UserId == userId).Select(pair => pair.Key).ToList())
            {
                _sessions.Remove(key);
            }

            return Task.CompletedTask;
        }
    }

    private sealed class ThrowingAuthHandoffStore : IAuthHandoffStore
    {
        public Task<(string Code, int ExpiresInSeconds)> CreateAsync(
            AuthHandoffPayload payload,
            CancellationToken cancellationToken = default) =>
            throw new RedisException("simulated outage");

        public Task<AuthHandoffPayload?> ExchangeAsync(
            string code,
            Guid? expectedTenantId,
            CancellationToken cancellationToken = default) =>
            throw new RedisException("simulated outage");
    }

    private sealed class StubHostEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;

        public string ApplicationName { get; set; } = "tests";

        public string ContentRootPath { get; set; } = "/tmp";

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
