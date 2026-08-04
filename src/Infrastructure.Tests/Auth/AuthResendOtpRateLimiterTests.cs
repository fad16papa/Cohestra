using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Tests.Infrastructure;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class AuthResendOtpRateLimiterTests
{
    [SkippableFact]
    public async Task Resend_attempts_block_after_threshold()
    {
        var redis = RedisTestConnection.TryConnect(out var skipReason);
        Skip.If(redis is null, skipReason ?? "Redis unavailable for AuthResendOtpRateLimiterTests.");

        var email = $"auth-resend-{Guid.NewGuid():N}@example.com";
        var clientIp = $"127.0.0.{Random.Shared.Next(10, 200)}";
        var limiter = new RedisAuthResendOtpRateLimiter(
            redis!,
            Options.Create(new AuthResendOtpRateLimitOptions
            {
                MaxResendsPerWindow = 3,
                WindowMinutes = 15,
            }));

        for (var i = 0; i < 3; i++)
        {
            Assert.True(await limiter.AllowResendAsync(email, clientIp));
            await limiter.RecordResendAsync(email, clientIp);
        }

        Assert.False(await limiter.AllowResendAsync(email, clientIp));
    }
}
