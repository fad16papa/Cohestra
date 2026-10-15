using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Legal;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
public sealed class RecaptchaLayerBIntegrationTests : IAsyncLifetime
{
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
    public async Task LayerB_isolated_enabled_recaptcha_accepts_dummy_token()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        using var response = await client.PostAsJsonAsync(
            "/api/v1/public/signup",
            NewSignup(captchaToken: "layer-b-official-test-token"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
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
