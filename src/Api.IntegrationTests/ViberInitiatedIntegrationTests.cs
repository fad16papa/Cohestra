using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Clients;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class ViberInitiatedIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task RecordViberInitiated_ClientWithPhone_ReturnsTimelineEvent()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var clientRecord = await IntegrationTestHelpers.SeedClientAsync(
            Factory.Services,
            client =>
            {
                client.FullName = "Viber Initiated Client";
                client.Phone = $"0918{suffix[..7]}";
                client.NormalizedPhone = $"+63918{suffix[..7]}";
            });

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var response = await client.PostAsync(
            $"/api/v1/admin/clients/{clientRecord.Id}/viber-initiated",
            null);

        response.EnsureSuccessStatusCode();

        var detail = await response.Content.ReadFromJsonAsync<ClientDetailResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(detail);
        Assert.Contains(
            detail.Timeline,
            item => string.Equals(item.EventType, "viber_initiated", StringComparison.Ordinal));
    }

    [SkippableFact]
    public async Task RecordViberInitiated_ClientWithoutPhone_Returns400()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var clientRecord = await IntegrationTestHelpers.SeedClientAsync(
            Factory.Services,
            client =>
            {
                client.FullName = "Viber No Phone Client";
                client.Phone = null;
                client.NormalizedPhone = null;
            });

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var response = await client.PostAsync(
            $"/api/v1/admin/clients/{clientRecord.Id}/viber-initiated",
            null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
