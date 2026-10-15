using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Application.Email;
using Cohestra.Contracts.Admin;
using Cohestra.Contracts.Auth;
using Cohestra.Contracts.Legal;
using Cohestra.Contracts.Signup;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
public sealed class RecaptchaLayerBIntegrationTests : IAsyncLifetime
{
    private static readonly Regex OtpCode = new(
        @"Your verification code is: (\d{6})",
        RegexOptions.Compiled);

    private RecaptchaLayerBWebApplicationFactory? _factory;

    private RecaptchaLayerBWebApplicationFactory Factory =>
        _factory ?? throw new InvalidOperationException("Test factory not initialized.");

    public async Task InitializeAsync()
    {
        _factory = new RecaptchaLayerBWebApplicationFactory();
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
    public async Task LayerB_empty_token_is_rejected()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        using var response = await client.PostAsJsonAsync(
            "/api/v1/public/signup",
            NewSignup(captchaToken: null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("CAPTCHA", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
    }

    [SkippableFact]
    public async Task LayerB_isolated_enabled_recaptcha_signup_otp_verify_auth_onboarding()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var request = NewSignup(captchaToken: "layer-b-official-test-token");
        using var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Host = $"{request.Slug}.localhost";

        using var signupResponse = await client.PostAsJsonAsync("/api/v1/public/signup", request);
        Assert.Equal(HttpStatusCode.Created, signupResponse.StatusCode);

        var signup = await signupResponse.Content.ReadFromJsonAsync<PublicSignupResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(signup);
        Assert.Equal(request.Slug, signup.TenantSlug);
        Assert.Equal(request.Email, signup.Email);

        var otp = ReadOtp(signup.Email);
        using var verifyResponse = await client.PostAsJsonAsync(
            "/api/v1/public/signup/verify-email",
            new SignupVerifyEmailRequest(request.Email, otp, request.Slug));
        Assert.Equal(HttpStatusCode.OK, verifyResponse.StatusCode);

        var verified = await verifyResponse.Content.ReadFromJsonAsync<SignupVerifyEmailResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(verified);
        Assert.False(string.IsNullOrWhiteSpace(verified.AccessToken));

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", verified.AccessToken);
        using var meResponse = await client.GetAsync("/api/v1/admin/me");
        Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);
        var me = await meResponse.Content.ReadFromJsonAsync<AdminProfileResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(me);
        Assert.Equal(request.Email, me.Email);

        using var onboardingResponse = await client.GetAsync("/api/v1/auth/onboarding");
        Assert.Equal(HttpStatusCode.OK, onboardingResponse.StatusCode);
        var onboarding = await onboardingResponse.Content.ReadFromJsonAsync<OnboardingStatusResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(onboarding);
    }

    private string ReadOtp(string email)
    {
        var sender = Factory.Services.GetRequiredService<IEmailSender>() as FakeEmailSender
            ?? throw new InvalidOperationException("Layer B factory must use FakeEmailSender.");
        var message = sender.Sent.Single(m =>
            string.Equals(m.ToEmail, email, StringComparison.OrdinalIgnoreCase));
        var match = OtpCode.Match(message.PlainTextBody);
        Assert.True(match.Success, "Layer B OTP email must contain a 6-digit verification code.");
        return match.Groups[1].Value;
    }

    private static PublicSignupRequest NewSignup(string? captchaToken)
    {
        var id = Guid.NewGuid().ToString("N")[..12];
        return new PublicSignupRequest(
            AcceptTermsAndPrivacy: true,
            TermsVersion: "2026-07-21",
            PrivacyVersion: "2026-07-21",
            OrgName: "Layer B Atelier",
            Slug: $"lb{id}"[..14],
            Email: $"layer-b-{id}@example.com",
            Password: "ChangeMe123!",
            CaptchaToken: captchaToken);
    }
}
