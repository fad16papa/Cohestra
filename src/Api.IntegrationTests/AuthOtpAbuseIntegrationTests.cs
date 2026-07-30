using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Application.Auth;
using Cohestra.Contracts.Auth;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
public sealed class AuthOtpAbuseIntegrationTests : IAsyncLifetime
{
    private AuthOtpAbuseWebApplicationFactory? _factory;

    private AuthOtpAbuseWebApplicationFactory Factory =>
        _factory ?? throw new InvalidOperationException("Test factory not initialized.");

    public async Task InitializeAsync()
    {
        _factory = new AuthOtpAbuseWebApplicationFactory();
        await _factory.InitializeAsync();
    }

    public async Task DisposeAsync()
    {
        if (_factory is not null)
        {
            await _factory.DisposeAsync();
        }
    }

    [SkippableFact]
    public async Task Reset_password_brute_force_returns_429_after_threshold()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        const string email = "operator@cohestra.local";
        const string validOtp = "123456";

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var otpStore = scope.ServiceProvider.GetRequiredService<IAuthOtpStore>();
            await otpStore.TryStoreAsync(
                email,
                OtpPurpose.PasswordReset,
                validOtp,
                TimeSpan.FromMinutes(10));
        }

        using var client = CreateClientWithUniqueIp(Factory);

        for (var attempt = 1; attempt <= 3; attempt++)
        {
            using var failResponse = await client.PostAsJsonAsync(
                "/api/v1/auth/reset-password",
                new ResetPasswordRequest(email, "000000", "ChangeMe456!"));

            Assert.Equal(HttpStatusCode.BadRequest, failResponse.StatusCode);
        }

        using var rateLimitedResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/reset-password",
            new ResetPasswordRequest(email, "000000", "ChangeMe456!"));

        Assert.Equal(HttpStatusCode.TooManyRequests, rateLimitedResponse.StatusCode);

        var errorCode = await ReadErrorCodeAsync(rateLimitedResponse);
        Assert.Equal("otp_verify_rate_limited", errorCode);

        using var successResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/reset-password",
            new ResetPasswordRequest(email, validOtp, "ChangeMe456!"));

        Assert.Equal(HttpStatusCode.TooManyRequests, successResponse.StatusCode);
    }

    private static HttpClient CreateClientWithUniqueIp(AuthOtpAbuseWebApplicationFactory factory)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add(
            "X-Forwarded-For",
            $"10.{Random.Shared.Next(1, 200)}.{Random.Shared.Next(1, 200)}.{Random.Shared.Next(1, 200)}");
        return client;
    }

    private static async Task<string?> ReadErrorCodeAsync(HttpResponseMessage response)
    {
        using var document = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        return document.RootElement.TryGetProperty("errorCode", out var code)
            ? code.GetString()
            : null;
    }
}
