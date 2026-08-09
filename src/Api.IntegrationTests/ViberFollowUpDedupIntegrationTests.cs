using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Cohestra.Contracts.Clients;
using Cohestra.Domain.Clients;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class ViberFollowUpDedupIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task RecordViberFollowUp_DuplicateStatusAndNote_Returns409()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var clientRecord = await IntegrationTestHelpers.SeedClientAsync(
            Factory.Services,
            client =>
            {
                client.FullName = "Viber Dedup Client";
                client.Phone = $"0916{suffix[..7]}";
                client.NormalizedPhone = $"+63916{suffix[..7]}";
            });

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var payload = new RecordViberFollowUpRequest("contacted", "Left a voice message");

        var firstResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/clients/{clientRecord.Id}/viber-follow-up",
            payload,
            IntegrationTestHelpers.JsonOptions);
        firstResponse.EnsureSuccessStatusCode();

        var duplicateResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/clients/{clientRecord.Id}/viber-follow-up",
            payload,
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);

        var problem = await duplicateResponse.Content.ReadFromJsonAsync<ProblemDetails>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(problem);
        Assert.Contains("identical Viber follow-up", problem.Detail, StringComparison.OrdinalIgnoreCase);
    }

    [SkippableFact]
    public async Task RecordViberFollowUp_DifferentNote_AllowsSecondEntry()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var clientRecord = await IntegrationTestHelpers.SeedClientAsync(
            Factory.Services,
            client =>
            {
                client.FullName = "Viber Note Change Client";
                client.Phone = $"0915{suffix[..7]}";
                client.NormalizedPhone = $"+63915{suffix[..7]}";
            });

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var firstResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/clients/{clientRecord.Id}/viber-follow-up",
            new RecordViberFollowUpRequest("contacted", "First note"),
            IntegrationTestHelpers.JsonOptions);
        firstResponse.EnsureSuccessStatusCode();

        var secondResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/clients/{clientRecord.Id}/viber-follow-up",
            new RecordViberFollowUpRequest("contacted", "Second note"),
            IntegrationTestHelpers.JsonOptions);

        secondResponse.EnsureSuccessStatusCode();
    }
}
