using Cohestra.Infrastructure.Platform;
using Cohestra.Infrastructure.Tests.Infrastructure;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Platform;

public sealed class RedisPlatformRecoveryRateLimiterTests
{
    [SkippableFact]
    public async Task Consumes_shared_actor_bucket_then_denies()
    {
        var redis = RedisTestConnection.TryConnect(out var skipReason);
        Skip.If(redis is null, skipReason ?? "Redis unavailable for RedisPlatformRecoveryRateLimiterTests.");

        var actorUserId = Guid.NewGuid();
        var limiter = new RedisPlatformRecoveryRateLimiter(
            redis!,
            Options.Create(new PlatformRecoveryRateLimitOptions
            {
                MaxActionsPerWindow = 3,
                WindowMinutes = 15,
            }));

        Assert.True(await limiter.TryConsumeAsync(actorUserId));
        Assert.True(await limiter.TryConsumeAsync(actorUserId));
        Assert.True(await limiter.TryConsumeAsync(actorUserId));
        Assert.False(await limiter.TryConsumeAsync(actorUserId));
        Assert.True(await limiter.TryConsumeAsync(Guid.NewGuid()));
    }

    [SkippableFact]
    public async Task Disabled_when_max_actions_is_zero()
    {
        var redis = RedisTestConnection.TryConnect(out var skipReason);
        Skip.If(redis is null, skipReason ?? "Redis unavailable for RedisPlatformRecoveryRateLimiterTests.");

        var limiter = new RedisPlatformRecoveryRateLimiter(
            redis!,
            Options.Create(new PlatformRecoveryRateLimitOptions
            {
                MaxActionsPerWindow = 0,
                WindowMinutes = 15,
            }));

        var actorUserId = Guid.NewGuid();
        Assert.True(await limiter.TryConsumeAsync(actorUserId));
        Assert.True(await limiter.TryConsumeAsync(actorUserId));
    }
}
