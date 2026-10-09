using Cohestra.Application.Platform;
using Cohestra.Application.RateLimiting;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Cohestra.Api.IntegrationTests.Infrastructure;

/// <summary>
/// Low per-actor recovery limits for 429 tests.
/// </summary>
public sealed class PlatformRecoveryRateLimitWebApplicationFactory : IntegrationTestWebApplicationFactory
{
    protected override void ApplyDefaultSettings(IWebHostBuilder builder)
    {
        base.ApplyDefaultSettings(builder);
        builder.UseSetting("PlatformRecoveryRateLimit:MaxActionsPerWindow", "2");
        builder.UseSetting("PlatformRecoveryRateLimit:WindowMinutes", "15");
    }
}

/// <summary>
/// Recovery limiter cannot reach Redis — HTTP 503 fail-closed path.
/// </summary>
public sealed class PlatformRecoveryLimiterUnavailableWebApplicationFactory : IntegrationTestWebApplicationFactory
{
    protected override void ConfigureTestServices(IWebHostBuilder builder)
    {
        base.ConfigureTestServices(builder);
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IPlatformRecoveryRateLimiter>();
            services.AddSingleton<IPlatformRecoveryRateLimiter, UnavailablePlatformRecoveryRateLimiter>();
        });
    }
}

internal sealed class UnavailablePlatformRecoveryRateLimiter : IPlatformRecoveryRateLimiter
{
    public Task<bool> TryConsumeAsync(Guid actorUserId, CancellationToken cancellationToken = default) =>
        throw new RateLimiterUnavailableException(
            "PlatformRecovery",
            new InvalidOperationException("Simulated Redis outage for platform recovery limiter."));
}
