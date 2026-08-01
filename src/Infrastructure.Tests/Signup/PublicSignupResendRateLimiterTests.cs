using Cohestra.Infrastructure.Signup;
using Cohestra.Infrastructure.Tests.Infrastructure;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Signup;

public sealed class PublicSignupResendRateLimiterTests
{
    [SkippableFact]
    public async Task Resend_attempts_block_after_threshold()
    {
        var redis = RedisTestConnection.TryConnect(out var skipReason);
        Skip.If(redis is null, skipReason ?? "Redis unavailable for PublicSignupResendRateLimiterTests.");

        var email = $"signup-resend-{Guid.NewGuid():N}@example.com";
        var clientIp = $"127.0.0.{Random.Shared.Next(10, 200)}";
        var limiter = new RedisPublicSignupResendRateLimiter(
            redis!,
            Options.Create(new PublicSignupResendRateLimitOptions
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
