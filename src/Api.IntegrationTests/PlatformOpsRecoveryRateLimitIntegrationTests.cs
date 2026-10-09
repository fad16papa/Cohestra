using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Application.Email;
using Cohestra.Application.RateLimiting;
using Cohestra.Contracts.Platform;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
public sealed class PlatformOpsRecoveryRateLimitIntegrationTests : IAsyncLifetime
{
    private PlatformRecoveryRateLimitWebApplicationFactory? _limitFactory;
    private PlatformRecoveryLimiterUnavailableWebApplicationFactory? _unavailableFactory;

    public async Task InitializeAsync()
    {
        _limitFactory = new PlatformRecoveryRateLimitWebApplicationFactory();
        await _limitFactory.InitializeAsync();
        _unavailableFactory = new PlatformRecoveryLimiterUnavailableWebApplicationFactory();
        await _unavailableFactory.InitializeAsync();
    }

    public async Task DisposeAsync()
    {
        if (_limitFactory is not null)
        {
            await _limitFactory.DisposeAsync();
        }

        if (_unavailableFactory is not null)
        {
            await _unavailableFactory.DisposeAsync();
        }
    }

    [SkippableFact]
    public async Task Recovery_posts_return_429_after_shared_actor_limit_without_sending_mail()
    {
        var factory = _limitFactory ?? throw new InvalidOperationException("Limit factory not initialized.");
        IntegrationTestHelpers.SkipIfUnavailable(factory);

        using var client = factory.CreateClient();
        var (actor, _) = await IntegrationTestHelpers.CreatePlatformAdminUserAsync(
            factory.Services,
            $"recovery-limiter-{Guid.NewGuid():N}@platform.test");
        IntegrationTestHelpers.UseBearerToken(client, IntegrationTestHelpers.MintPlatformAccessToken(factory.Services, actor));

        var slug = $"rl-{Guid.NewGuid():N}"[..12];
        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            client,
            "Recovery Limit Org",
            slug,
            $"admin-{slug}@recovery-limit.test");
        var (verified, _) = await IntegrationTestHelpers.CreateTenantMemberUserAsync(
            factory.Services,
            tenant.Id,
            $"verified-{Guid.NewGuid():N}@recovery-limit.test");
        var (unverified, _) = await IntegrationTestHelpers.CreateTenantMemberUserAsync(
            factory.Services,
            tenant.Id,
            $"unverified-{Guid.NewGuid():N}@recovery-limit.test");
        await IntegrationTestHelpers.SetEmailConfirmedAsync(factory.Services, unverified.Id, false);

        var emails = (FakeEmailSender)factory.Services.GetRequiredService<IEmailSender>();
        var sentBefore = emails.SentCount;

        using var resetAllowed = await client.PostAsync(
            $"/api/v1/platform/tenants/{tenant.Id}/members/{verified.Id}/send-password-reset",
            content: null);
        Assert.Equal(HttpStatusCode.OK, resetAllowed.StatusCode);

        using var resendAllowed = await client.PostAsync(
            $"/api/v1/platform/tenants/{tenant.Id}/members/{unverified.Id}/resend-email-verification",
            content: null);
        Assert.Equal(HttpStatusCode.OK, resendAllowed.StatusCode);

        var sentAfterAllowed = emails.SentCount;
        Assert.True(sentAfterAllowed > sentBefore);

        using var blockedReset = await client.PostAsync(
            $"/api/v1/platform/tenants/{tenant.Id}/members/{verified.Id}/send-password-reset",
            content: null);
        await AssertRateLimitedAsync(blockedReset);

        using var blockedResend = await client.PostAsync(
            $"/api/v1/platform/tenants/{tenant.Id}/members/{unverified.Id}/resend-email-verification",
            content: null);
        await AssertRateLimitedAsync(blockedResend);

        Assert.Equal(sentAfterAllowed, emails.SentCount);
    }

    [SkippableFact]
    public async Task Recovery_posts_return_503_when_limiter_cannot_reach_redis_without_sending_mail()
    {
        var factory = _unavailableFactory
            ?? throw new InvalidOperationException("Unavailable factory not initialized.");
        IntegrationTestHelpers.SkipIfUnavailable(factory);

        using var client = factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        var slug = $"ru-{Guid.NewGuid():N}"[..12];
        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            client,
            "Recovery Unavailable Org",
            slug,
            $"admin-{slug}@recovery-unavailable.test");
        var (verified, _) = await IntegrationTestHelpers.CreateTenantMemberUserAsync(
            factory.Services,
            tenant.Id,
            $"verified-{Guid.NewGuid():N}@recovery-unavailable.test");

        var emails = (FakeEmailSender)factory.Services.GetRequiredService<IEmailSender>();
        var sentBefore = emails.SentCount;

        using var resetResponse = await client.PostAsync(
            $"/api/v1/platform/tenants/{tenant.Id}/members/{verified.Id}/send-password-reset",
            content: null);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, resetResponse.StatusCode);
        Assert.Equal(
            RateLimitErrorCodes.Unavailable,
            await IntegrationTestHelpers.ReadProblemErrorCodeAsync(resetResponse));

        using var resendResponse = await client.PostAsync(
            $"/api/v1/platform/tenants/{tenant.Id}/members/{verified.Id}/resend-email-verification",
            content: null);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, resendResponse.StatusCode);
        Assert.Equal(
            RateLimitErrorCodes.Unavailable,
            await IntegrationTestHelpers.ReadProblemErrorCodeAsync(resendResponse));

        Assert.Equal(sentBefore, emails.SentCount);
    }

    private static async Task AssertRateLimitedAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        var mediaType = response.Content.Headers.ContentType?.MediaType;
        Assert.True(
            string.Equals(mediaType, "application/problem+json", StringComparison.OrdinalIgnoreCase)
            || string.Equals(mediaType, "application/json", StringComparison.OrdinalIgnoreCase),
            $"Expected ProblemDetails media type, got '{mediaType}'.");

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains(RateLimitErrorCodes.PlatformRecoveryRateLimited, body, StringComparison.Ordinal);
        Assert.Contains("Too many recovery requests", body, StringComparison.Ordinal);
        Assert.DoesNotContain("@", body);
    }
}
