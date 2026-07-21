using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Legal;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class PublicLegalIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task LegalVersions_Get_ReturnsCurrentVersions()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        using var response = await client.GetAsync("/api/v1/public/legal/versions");
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<LegalComplianceVersionsResponse>(
            IntegrationTestHelpers.JsonOptions);

        Assert.NotNull(payload);
        Assert.False(string.IsNullOrWhiteSpace(payload.TermsVersion));
        Assert.False(string.IsNullOrWhiteSpace(payload.PrivacyVersion));
        Assert.Equal("/terms", payload.TermsPath);
        Assert.Equal("/privacy", payload.PrivacyPath);
    }

    [SkippableFact]
    public async Task PublicSignup_Post_WithoutLegalAcceptance_Returns400()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        using var response = await client.PostAsJsonAsync(
            "/api/v1/public/signup",
            new PublicSignupRequest(
                AcceptTermsAndPrivacy: false,
                TermsVersion: "2026-07-21",
                PrivacyVersion: "2026-07-21",
                OrgName: null,
                Slug: null,
                Email: null,
                Password: null,
                CaptchaToken: null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [SkippableFact]
    public async Task PublicSignup_Post_WithLegalOnly_Returns400UntilFieldsProvided()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        using var response = await client.PostAsJsonAsync(
            "/api/v1/public/signup",
            new PublicSignupRequest(
                AcceptTermsAndPrivacy: true,
                TermsVersion: "2026-07-21",
                PrivacyVersion: "2026-07-21",
                OrgName: null,
                Slug: null,
                Email: null,
                Password: null,
                CaptchaToken: null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
