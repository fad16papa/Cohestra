using Cohestra.Application.Auth;
using Cohestra.Infrastructure.Auth;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class AuthHandoffStoreTests
{
    [SkippableFact]
    public async Task CreateAndExchange_consumes_code_once_and_validates_tenant()
    {
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__Redis") ?? "localhost:6379";
        IConnectionMultiplexer redis;
        try
        {
            redis = ConnectionMultiplexer.Connect(connection);
        }
        catch (RedisConnectionException)
        {
            Skip.If(true, "Redis unavailable for AuthHandoffStoreTests.");
            return;
        }

        var store = new RedisAuthHandoffStore(
            redis,
            Options.Create(new AuthHandoffOptions { TtlSeconds = 120 }));

        var tenantA = Guid.CreateVersion7();
        var tenantB = Guid.CreateVersion7();
        var payload = new AuthHandoffPayload(
            tenantA,
            "tenant-a",
            "access-token",
            "refresh-token",
            900);

        var (code, _) = await store.CreateAsync(payload);
        Assert.False(string.IsNullOrWhiteSpace(code));

        var wrongTenant = await store.ExchangeAsync(code, tenantB);
        Assert.Null(wrongTenant);

        var first = await store.ExchangeAsync(code, tenantA);
        Assert.NotNull(first);
        Assert.Equal("access-token", first!.AccessToken);

        var second = await store.ExchangeAsync(code, tenantA);
        Assert.Null(second);
    }
}
