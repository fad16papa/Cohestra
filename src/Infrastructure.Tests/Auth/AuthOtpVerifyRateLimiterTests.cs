using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Tests.Infrastructure;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class AuthOtpVerifyRateLimiterTests
{
    [SkippableFact]
    public async Task Failed_attempts_block_after_threshold_and_clear_on_success()
    {
        var redis = RedisTestConnection.TryConnect(out var skipReason);
        Skip.If(redis is null, skipReason ?? "Redis unavailable for AuthOtpVerifyRateLimiterTests.");

        var email = $"auth-otp-{Guid.NewGuid():N}@example.com";
        var clientIp = $"127.0.0.{Random.Shared.Next(10, 200)}";
        var limiter = new RedisAuthOtpVerifyRateLimiter(
            redis!,
            Options.Create(new AuthOtpVerifyRateLimitOptions
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
