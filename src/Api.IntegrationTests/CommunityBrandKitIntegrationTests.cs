using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Activities;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class CommunityBrandKitIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task CommunityBrandKit_UpdateAccentAndHero_Succeeds()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var communityName = $"Brand Kit Community {Guid.NewGuid():N}";

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var createResponse = await client.PostAsJsonAsync(
            "/api/v1/admin/communities",
            new CreateCommunityRequest(communityName),
            IntegrationTestHelpers.JsonOptions);
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<CommunityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(created);

        var updateResponse = await client.PatchAsJsonAsync(
            $"/api/v1/admin/communities/{created.Id}",
            new UpdateCommunityRequest(
                communityName,
                LogoAssetId: null,
                AccentColor: "#2d6a4f",
                DefaultHeroImageUrl: "https://example.com/hero.jpg"),
            IntegrationTestHelpers.JsonOptions);
        updateResponse.EnsureSuccessStatusCode();

        var updated = await updateResponse.Content.ReadFromJsonAsync<CommunityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(updated);
        Assert.Equal("#2d6a4f", updated.AccentColor);
        Assert.Equal("https://example.com/hero.jpg", updated.DefaultHeroImageUrl);
        Assert.Null(updated.LogoAssetId);

        var deleteResponse = await client.DeleteAsync($"/api/v1/admin/communities/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }

    [SkippableFact]
    public async Task CommunityBrandKit_InvalidAccent_Returns400()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var communityName = $"Invalid Accent {Guid.NewGuid():N}";

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var createResponse = await client.PostAsJsonAsync(
            "/api/v1/admin/communities",
            new CreateCommunityRequest(communityName),
            IntegrationTestHelpers.JsonOptions);
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<CommunityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(created);

        var updateResponse = await client.PatchAsJsonAsync(
            $"/api/v1/admin/communities/{created.Id}",
            new UpdateCommunityRequest(communityName, AccentColor: "not-hex"),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);

        await client.DeleteAsync($"/api/v1/admin/communities/{created.Id}");
    }
}
