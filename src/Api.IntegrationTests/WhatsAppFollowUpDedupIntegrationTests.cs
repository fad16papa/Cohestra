using System.Net;
using System.Net.Http.Json;
using LeadGenerationCrm.Api.IntegrationTests.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using LeadGenerationCrm.Contracts.Clients;
using LeadGenerationCrm.Domain.Clients;

namespace LeadGenerationCrm.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class WhatsAppFollowUpDedupIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task RecordWhatsAppFollowUp_DuplicateStatusAndNote_Returns409()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var clientRecord = await IntegrationTestHelpers.SeedClientAsync(
            Factory.Services,
            client =>
            {
                client.FullName = "WhatsApp Dedup Client";
                client.Phone = $"0918{suffix[..7]}";
                client.NormalizedPhone = $"+63918{suffix[..7]}";
            });

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var payload = new RecordWhatsAppFollowUpRequest("contacted", "Left a voice message");

        var firstResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/clients/{clientRecord.Id}/whatsapp-follow-up",
            payload,
            IntegrationTestHelpers.JsonOptions);
        firstResponse.EnsureSuccessStatusCode();

        var duplicateResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/clients/{clientRecord.Id}/whatsapp-follow-up",
            payload,
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);

        var problem = await duplicateResponse.Content.ReadFromJsonAsync<ProblemDetails>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(problem);
        Assert.Contains("identical WhatsApp follow-up", problem.Detail, StringComparison.OrdinalIgnoreCase);
    }

    [SkippableFact]
    public async Task RecordWhatsAppFollowUp_DifferentNote_AllowsSecondEntry()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var clientRecord = await IntegrationTestHelpers.SeedClientAsync(
            Factory.Services,
            client =>
            {
                client.FullName = "WhatsApp Note Change Client";
                client.Phone = $"0917{suffix[..7]}";
                client.NormalizedPhone = $"+63917{suffix[..7]}";
            });

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var firstResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/clients/{clientRecord.Id}/whatsapp-follow-up",
            new RecordWhatsAppFollowUpRequest("contacted", "First note"),
            IntegrationTestHelpers.JsonOptions);
        firstResponse.EnsureSuccessStatusCode();

        var secondResponse = await client.PostAsJsonAsync(
            $"/api/v1/admin/clients/{clientRecord.Id}/whatsapp-follow-up",
            new RecordWhatsAppFollowUpRequest("contacted", "Second note"),
            IntegrationTestHelpers.JsonOptions);

        secondResponse.EnsureSuccessStatusCode();
    }
}
