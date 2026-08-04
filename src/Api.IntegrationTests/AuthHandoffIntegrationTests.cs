using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Application.Auth;
using Cohestra.Contracts.Auth;
using Cohestra.Contracts.Legal;
using Cohestra.Contracts.Signup;
using Cohestra.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class AuthHandoffIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task SignupVerify_ForCheckout_ReturnsHandoffCode_ExchangeSucceedsOnce()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"handoff-{Guid.NewGuid():N}"[..20];
        var email = $"handoff-{Guid.NewGuid():N}@example.com";
        const string password = "ChangeMe123!";
        const string otpCode = "123456";

        using var signupClient = Factory.CreateClient();
        using var signupResponse = await signupClient.PostAsJsonAsync(
            "/api/v1/public/signup",
            new PublicSignupRequest(
                AcceptTermsAndPrivacy: true,
                TermsVersion: "2026-07-21",
                PrivacyVersion: "2026-07-21",
                OrgName: "Handoff Atelier",
                Slug: slug,
                Email: email,
                Password: password,
                CaptchaToken: "test-captcha-pass"));

        Assert.Equal(HttpStatusCode.Created, signupResponse.StatusCode);

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var otpStore = scope.ServiceProvider.GetRequiredService<IAuthOtpStore>();
            await otpStore.TryStoreAsync(
                email,
                OtpPurpose.EmailVerification,
                otpCode,
                TimeSpan.FromMinutes(10));
        }

        using var verifyResponse = await signupClient.PostAsJsonAsync(
            "/api/v1/public/signup/verify-email",
            new SignupVerifyEmailRequest(email, otpCode, slug, ForCheckout: true));

        verifyResponse.EnsureSuccessStatusCode();
        var verifyPayload = await verifyResponse.Content.ReadFromJsonAsync<SignupVerifyEmailResponse>(
            IntegrationTestHelpers.JsonOptions);

        Assert.NotNull(verifyPayload);
        Assert.Equal(slug, verifyPayload.TenantSlug);
        Assert.False(string.IsNullOrWhiteSpace(verifyPayload.HandoffCode));
        Assert.Null(verifyPayload.AccessToken);
        Assert.Null(verifyPayload.RefreshToken);

        using var tenantClient = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(tenantClient, slug);

        using var exchangeResponse = await tenantClient.PostAsJsonAsync(
            "/api/v1/auth/handoff/exchange",
            new AuthHandoffExchangeRequest(verifyPayload.HandoffCode));

        exchangeResponse.EnsureSuccessStatusCode();
        var tokens = await exchangeResponse.Content.ReadFromJsonAsync<AuthTokenResponse>(
            IntegrationTestHelpers.JsonOptions);

        Assert.NotNull(tokens);
        Assert.False(string.IsNullOrWhiteSpace(tokens.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(tokens.RefreshToken));

        using var secondExchange = await tenantClient.PostAsJsonAsync(
            "/api/v1/auth/handoff/exchange",
            new AuthHandoffExchangeRequest(verifyPayload.HandoffCode));

        Assert.Equal(HttpStatusCode.BadRequest, secondExchange.StatusCode);
    }

    [SkippableFact]
    public async Task SignupVerify_BasicPath_ReturnsTokensDirectly()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"basic-{Guid.NewGuid():N}"[..20];
        var email = $"basic-{Guid.NewGuid():N}@example.com";
        const string otpCode = "654321";

        using var client = Factory.CreateClient();
        using var signupResponse = await client.PostAsJsonAsync(
            "/api/v1/public/signup",
            new PublicSignupRequest(
                AcceptTermsAndPrivacy: true,
                TermsVersion: "2026-07-21",
                PrivacyVersion: "2026-07-21",
                OrgName: "Basic Atelier",
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
                otpCode,
                TimeSpan.FromMinutes(10));
        }

        using var verifyResponse = await client.PostAsJsonAsync(
            "/api/v1/public/signup/verify-email",
            new SignupVerifyEmailRequest(email, otpCode, slug, ForCheckout: false));

        verifyResponse.EnsureSuccessStatusCode();
        var verifyPayload = await verifyResponse.Content.ReadFromJsonAsync<SignupVerifyEmailResponse>(
            IntegrationTestHelpers.JsonOptions);

        Assert.NotNull(verifyPayload);
        Assert.False(string.IsNullOrWhiteSpace(verifyPayload.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(verifyPayload.RefreshToken));
        Assert.Null(verifyPayload.HandoffCode);
    }

    [SkippableFact]
    public async Task HandoffExchange_OnWrongTenantHost_ReturnsBadRequest()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slugA = $"tena-{Guid.NewGuid():N}"[..20];
        var slugB = $"tenb-{Guid.NewGuid():N}"[..20];
        var email = $"wrong-{Guid.NewGuid():N}@example.com";
        const string otpCode = "112233";

        using var client = Factory.CreateClient();
        using var signupResponse = await client.PostAsJsonAsync(
            "/api/v1/public/signup",
            new PublicSignupRequest(
                AcceptTermsAndPrivacy: true,
                TermsVersion: "2026-07-21",
                PrivacyVersion: "2026-07-21",
                OrgName: "Tenant A",
                Slug: slugA,
                Email: email,
                Password: "ChangeMe123!",
                CaptchaToken: "test-captcha-pass"));

        signupResponse.EnsureSuccessStatusCode();

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            db.Tenants.Add(new Domain.Tenants.Tenant
            {
                Id = Guid.CreateVersion7(),
                Slug = slugB,
                Name = slugB,
                Plan = Domain.Tenants.TenantPlan.Basic,
                Status = Domain.Tenants.TenantStatus.Active,
                BillingStatus = Domain.Billing.BillingStatus.Free,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();

            var otpStore = scope.ServiceProvider.GetRequiredService<IAuthOtpStore>();
            await otpStore.TryStoreAsync(
                email,
                OtpPurpose.EmailVerification,
                otpCode,
                TimeSpan.FromMinutes(10));
        }

        using var verifyResponse = await client.PostAsJsonAsync(
            "/api/v1/public/signup/verify-email",
            new SignupVerifyEmailRequest(email, otpCode, slugA, ForCheckout: true));

        verifyResponse.EnsureSuccessStatusCode();
        var verifyPayload = await verifyResponse.Content.ReadFromJsonAsync<SignupVerifyEmailResponse>(
            IntegrationTestHelpers.JsonOptions);

        Assert.NotNull(verifyPayload);
        Assert.False(string.IsNullOrWhiteSpace(verifyPayload.HandoffCode));

        using var wrongHostClient = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(wrongHostClient, slugB);

        using var exchangeResponse = await wrongHostClient.PostAsJsonAsync(
            "/api/v1/auth/handoff/exchange",
            new AuthHandoffExchangeRequest(verifyPayload.HandoffCode));

        Assert.Equal(HttpStatusCode.BadRequest, exchangeResponse.StatusCode);

        using var correctHostClient = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(correctHostClient, slugA);

        using var successResponse = await correctHostClient.PostAsJsonAsync(
            "/api/v1/auth/handoff/exchange",
            new AuthHandoffExchangeRequest(verifyPayload.HandoffCode));

        successResponse.EnsureSuccessStatusCode();
    }
}
