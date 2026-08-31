using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Admin;
using Cohestra.Domain.Tenants;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class TenantEmbedSettingsIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task Patch_invalid_origin_returns_400()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);
        IntegrationTestHelpers.UseTenantHost(client, TenantIds.DefaultSlug);

        using var response = await client.PatchAsJsonAsync(
            "/api/v1/admin/tenant/embed-settings",
            new UpdateTenantEmbedSettingsRequest(["https://*.example.com"]),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [SkippableFact]
    public async Task Patch_valid_list_round_trips_on_get()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);
        IntegrationTestHelpers.UseTenantHost(client, TenantIds.DefaultSlug);

        var origins = new[] { "https://club.example.com", "https://www.notion.so" };

        using var patchResponse = await client.PatchAsJsonAsync(
            "/api/v1/admin/tenant/embed-settings",
            new UpdateTenantEmbedSettingsRequest(origins),
            IntegrationTestHelpers.JsonOptions);
        patchResponse.EnsureSuccessStatusCode();

        var patched = await patchResponse.Content.ReadFromJsonAsync<TenantEmbedSettingsResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(patched);
        Assert.Equal(2, patched.AllowedEmbedOrigins.Count);
        Assert.Contains("https://club.example.com", patched.AllowedEmbedOrigins);
        Assert.Contains("https://www.notion.so", patched.AllowedEmbedOrigins);

        using var getResponse = await client.GetAsync("/api/v1/admin/tenant/embed-settings");
        getResponse.EnsureSuccessStatusCode();

        var fetched = await getResponse.Content.ReadFromJsonAsync<TenantEmbedSettingsResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(fetched);
        Assert.Equal(patched.AllowedEmbedOrigins, fetched.AllowedEmbedOrigins);
    }

    [SkippableFact]
    public async Task Public_embed_origins_returns_tenant_allow_list()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var adminClient = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, token);
        IntegrationTestHelpers.UseTenantHost(adminClient, TenantIds.DefaultSlug);

        using var patchResponse = await adminClient.PatchAsJsonAsync(
            "/api/v1/admin/tenant/embed-settings",
            new UpdateTenantEmbedSettingsRequest(["https://club.example.com"]),
            IntegrationTestHelpers.JsonOptions);
        patchResponse.EnsureSuccessStatusCode();

        using var publicClient = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(publicClient, TenantIds.DefaultSlug);

        using var response = await publicClient.GetAsync("/api/v1/public/embed-origins");
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<PublicEmbedOriginsDto>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(body);
        Assert.Contains("https://club.example.com", body.AllowedEmbedOrigins);
    }

    private sealed record PublicEmbedOriginsDto(IReadOnlyList<string> AllowedEmbedOrigins);
}
