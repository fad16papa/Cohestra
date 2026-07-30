using Cohestra.Infrastructure.Signup;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Tests.Signup;

public sealed class PublicSignupVerifyRateLimiterTests
{
    [SkippableFact]
    public async Task Failed_attempts_block_after_threshold_and_clear_on_success()
    {
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__Redis") ?? "localhost:6379";
        IConnectionMultiplexer redis;
        try
        {
            redis = ConnectionMultiplexer.Connect(connection);
        }
        catch (RedisConnectionException)
        {
            Skip.If(true, "Redis unavailable for PublicSignupVerifyRateLimiterTests.");
            return;
        }

        var email = $"verify-limit-{Guid.NewGuid():N}@example.com";
        var clientIp = $"127.0.0.{Random.Shared.Next(10, 200)}";
        var limiter = new RedisPublicSignupVerifyRateLimiter(
            redis,
            Options.Create(new PublicSignupVerifyRateLimitOptions
            {
                MaxFailedAttemptsPerWindow = 3,
                WindowMinutes = 15,
            }));

        await limiter.ClearFailuresAsync(email, clientIp);

        for (var i = 0; i < 3; i++)
        {
            Assert.True(await limiter.AllowVerifyAsync(email, clientIp));
            await limiter.RecordFailedVerifyAsync(email, clientIp);
        }

        Assert.False(await limiter.AllowVerifyAsync(email, clientIp));

        await limiter.ClearFailuresAsync(email, clientIp);
        Assert.True(await limiter.AllowVerifyAsync(email, clientIp));
    }
}
