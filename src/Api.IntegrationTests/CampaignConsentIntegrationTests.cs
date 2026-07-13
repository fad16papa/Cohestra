using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Campaigns;
using Cohestra.Domain.Clients;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class CampaignConsentIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task SendCampaign_ClientWithoutConsent_IsSkipped()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var email = $"noconsent-{Guid.NewGuid():N}@example.com";
        var clientRecord = await IntegrationTestHelpers.SeedClientAsync(
            Factory.Services,
            client =>
            {
                client.FullName = "No Consent Client";
                client.Email = email;
                client.NormalizedEmail = email;
                client.ConsentGiven = false;
            });

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var response = await client.PostAsJsonAsync(
            "/api/v1/admin/campaigns/send",
            new SendCampaignRequest(
                Subject: "Integration consent skip",
                Body: "This should not send without consent.",
                EmailTemplateId: null,
                Segment: new ClientSegmentQueryRequest(
                    ActivityIds: null,
                    LeadStatus: null,
                    Community: null,
                    ClientIds: [clientRecord.Id],
                    AllClients: false)),
            IntegrationTestHelpers.JsonOptions);

        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<SendCampaignResponse>(
            IntegrationTestHelpers.JsonOptions);

        Assert.NotNull(result);
        Assert.Equal(0, result.SentCount);
        Assert.Equal(1, result.SkippedCount);
        Assert.Contains(
            result.Results,
            item => item.ClientId == clientRecord.Id &&
                    string.Equals(item.Status, "skipped", StringComparison.OrdinalIgnoreCase));
    }
}
