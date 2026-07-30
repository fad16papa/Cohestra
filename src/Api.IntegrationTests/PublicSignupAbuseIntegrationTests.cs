using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Application.Auth;
using Cohestra.Contracts.Legal;
using Cohestra.Contracts.Signup;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
public sealed class PublicSignupAbuseIntegrationTests : IAsyncLifetime
{
    private PublicSignupAbuseWebApplicationFactory? _factory;

    private PublicSignupAbuseWebApplicationFactory Factory =>
        _factory ?? throw new InvalidOperationException("Test factory not initialized.");

    public async Task InitializeAsync()
    {
        _factory = new PublicSignupAbuseWebApplicationFactory();
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
    public async Task Signup_missing_captcha_token_is_rejected()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"captcha-{Guid.NewGuid():N}"[..20];
        var email = $"captcha-{Guid.NewGuid():N}@example.com";

        using var client = CreateClientWithUniqueIp(Factory);
        using var response = await client.PostAsJsonAsync(
            "/api/v1/public/signup",
            new PublicSignupRequest(
                AcceptTermsAndPrivacy: true,
                TermsVersion: "2026-07-21",
                PrivacyVersion: "2026-07-21",
                OrgName: "Captcha Test Atelier",
                Slug: slug,
                Email: email,
                Password: "ChangeMe123!",
                CaptchaToken: null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("CAPTCHA", body, StringComparison.OrdinalIgnoreCase);
    }

    [SkippableFact]
    public async Task Signup_ip_rate_limit_returns_429_after_threshold()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = CreateClientWithUniqueIp(Factory);

        for (var i = 0; i < 2; i++)
        {
            var slug = $"rl-{Guid.NewGuid():N}"[..20];
            var email = $"rl-{Guid.NewGuid():N}@example.com";

            using var response = await client.PostAsJsonAsync(
                "/api/v1/public/signup",
                new PublicSignupRequest(
                    AcceptTermsAndPrivacy: true,
                    TermsVersion: "2026-07-21",
                    PrivacyVersion: "2026-07-21",
                    OrgName: "Rate Limit Atelier",
                    Slug: slug,
                    Email: email,
                    Password: "ChangeMe123!",
                    CaptchaToken: "test-captcha-pass"));

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        var blockedSlug = $"rl-{Guid.NewGuid():N}"[..20];
        var blockedEmail = $"rl-{Guid.NewGuid():N}@example.com";

        using var blockedResponse = await client.PostAsJsonAsync(
            "/api/v1/public/signup",
            new PublicSignupRequest(
                AcceptTermsAndPrivacy: true,
                TermsVersion: "2026-07-21",
                PrivacyVersion: "2026-07-21",
                OrgName: "Rate Limit Blocked",
                Slug: blockedSlug,
                Email: blockedEmail,
                Password: "ChangeMe123!",
                CaptchaToken: "test-captcha-pass"));

        Assert.Equal(HttpStatusCode.TooManyRequests, blockedResponse.StatusCode);

        var errorCode = await ReadErrorCodeAsync(blockedResponse);
        Assert.Equal("signup_rate_limited", errorCode);
    }

    [SkippableFact]
    public async Task Signup_registration_closed_returns_403()
    {
        await using var closedFactory = new PublicSignupAbuseWebApplicationFactory(
            extraConfigure: builder => builder.UseSetting("SelfServeSignup:RegistrationClosed", "true"));
        await closedFactory.InitializeAsync();
        IntegrationTestHelpers.SkipIfUnavailable(closedFactory);

        var slug = $"closed-{Guid.NewGuid():N}"[..20];
        var email = $"closed-{Guid.NewGuid():N}@example.com";

        using var client = CreateClientWithUniqueIp(closedFactory);
        using var response = await client.PostAsJsonAsync(
            "/api/v1/public/signup",
            new PublicSignupRequest(
                AcceptTermsAndPrivacy: true,
                TermsVersion: "2026-07-21",
                PrivacyVersion: "2026-07-21",
                OrgName: "Closed Atelier",
                Slug: slug,
                Email: email,
                Password: "ChangeMe123!",
                CaptchaToken: "test-captcha-pass"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [SkippableFact]
    public async Task Verify_email_brute_force_returns_429_after_threshold()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"otp-{Guid.NewGuid():N}"[..20];
        var email = $"otp-{Guid.NewGuid():N}@example.com";
        const string validOtp = "123456";

        using var client = CreateClientWithUniqueIp(Factory);
        using var signupResponse = await client.PostAsJsonAsync(
            "/api/v1/public/signup",
            new PublicSignupRequest(
                AcceptTermsAndPrivacy: true,
                TermsVersion: "2026-07-21",
                PrivacyVersion: "2026-07-21",
                OrgName: "OTP Abuse Atelier",
                Slug: slug,
                Email: email,
                Password: "ChangeMe123!",
                CaptchaToken: "test-captcha-pass"));

        Assert.Equal(HttpStatusCode.Created, signupResponse.StatusCode);

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var otpStore = scope.ServiceProvider.GetRequiredService<IAuthOtpStore>();
            await otpStore.TryStoreAsync(
                email,
                OtpPurpose.EmailVerification,
                validOtp,
                TimeSpan.FromMinutes(10));
        }

        for (var attempt = 1; attempt <= 3; attempt++)
        {
            using var failResponse = await client.PostAsJsonAsync(
                "/api/v1/public/signup/verify-email",
                new SignupVerifyEmailRequest(email, "000000", slug));

            Assert.Equal(HttpStatusCode.BadRequest, failResponse.StatusCode);
        }

        using var rateLimitedResponse = await client.PostAsJsonAsync(
            "/api/v1/public/signup/verify-email",
            new SignupVerifyEmailRequest(email, "000000", slug));

        Assert.Equal(HttpStatusCode.TooManyRequests, rateLimitedResponse.StatusCode);

        var errorCode = await ReadErrorCodeAsync(rateLimitedResponse);
        Assert.Equal("signup_verify_rate_limited", errorCode);

        using var successResponse = await client.PostAsJsonAsync(
            "/api/v1/public/signup/verify-email",
            new SignupVerifyEmailRequest(email, validOtp, slug));

        Assert.Equal(HttpStatusCode.TooManyRequests, successResponse.StatusCode);
    }

    private static HttpClient CreateClientWithUniqueIp(PublicSignupAbuseWebApplicationFactory factory)
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
