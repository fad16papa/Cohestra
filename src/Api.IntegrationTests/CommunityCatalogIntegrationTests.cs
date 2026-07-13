using System.Net;
using System.Net.Http.Json;
using LeadGenerationCrm.Api.IntegrationTests.Infrastructure;
using LeadGenerationCrm.Contracts.Activities;

namespace LeadGenerationCrm.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class CommunityCatalogIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task CommunityCatalog_CreateListUpdateDelete_Succeeds()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var communityName = $"Integration Community {Guid.NewGuid():N}";

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
        Assert.Equal(communityName, created.Name);

        var listResponse = await client.GetAsync("/api/v1/admin/communities");
        listResponse.EnsureSuccessStatusCode();

        var list = await listResponse.Content.ReadFromJsonAsync<CommunityListResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(list);
        Assert.Contains(list.Items, item => item.Id == created.Id);

        var updatedName = $"{communityName} Updated";
        var updateResponse = await client.PatchAsJsonAsync(
            $"/api/v1/admin/communities/{created.Id}",
            new UpdateCommunityRequest(updatedName),
            IntegrationTestHelpers.JsonOptions);
        updateResponse.EnsureSuccessStatusCode();

        var updated = await updateResponse.Content.ReadFromJsonAsync<CommunityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(updated);
        Assert.Equal(updatedName, updated.Name);

        var deleteResponse = await client.DeleteAsync($"/api/v1/admin/communities/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getAfterDelete = await client.GetAsync($"/api/v1/admin/communities/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getAfterDelete.StatusCode);
    }
}
