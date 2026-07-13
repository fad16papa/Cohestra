using System.Net.Http.Json;
using LeadGenerationCrm.Api.IntegrationTests.Infrastructure;
using LeadGenerationCrm.Contracts.Email;

namespace LeadGenerationCrm.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class EmailDeliveryStatusIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task GetEmailDeliveryStatus_ReturnsChecklistWithoutSecrets()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var response = await client.GetAsync("/api/v1/admin/email-delivery/status");
        response.EnsureSuccessStatusCode();

        var status = await response.Content.ReadFromJsonAsync<EmailDeliveryStatusResponse>(
            IntegrationTestHelpers.JsonOptions);

        Assert.NotNull(status);
        Assert.True(status.ApiKeyConfigured);
        Assert.True(status.SandboxMode);
        Assert.NotEmpty(status.FromEmail);
        Assert.Contains(status.Checklist, item => item.Id == "sendgrid-api-key");
        Assert.Contains(status.Checklist, item => item.Id == "sandbox-mode");
        Assert.DoesNotContain(status.Checklist, item => item.Detail.Contains("SG.", StringComparison.Ordinal));
    }
}
