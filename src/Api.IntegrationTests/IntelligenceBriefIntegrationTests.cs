using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Intelligence;
using Cohestra.Domain.Clients;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class IntelligenceBriefIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task GetBrief_WithoutToken_Returns401()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        using var response = await client.GetAsync("/api/v1/admin/intelligence/brief");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [SkippableFact]
    public async Task GetBrief_AsOperator_ReturnsDeterministicBrief()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        var dueName = $"Brief Due {Guid.NewGuid():N}"[..28];
        await IntegrationTestHelpers.SeedClientAsync(
            Factory.Services,
            client =>
            {
                client.FullName = dueName;
                client.LeadStatus = LeadStatus.Active;
                client.NextFollowUpAt = DateTimeOffset.UtcNow.AddHours(-2);
            });

        using var http = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(http);
        IntegrationTestHelpers.UseBearerToken(http, accessToken);

        using var response = await http.GetAsync("/api/v1/admin/intelligence/brief");
        response.EnsureSuccessStatusCode();

        var brief = await response.Content.ReadFromJsonAsync<IntelligenceBriefResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(brief);
        Assert.Equal("deterministic", brief!.Mode);
        Assert.False(string.IsNullOrWhiteSpace(brief.TimeZoneId));
        Assert.Contains(
            brief.Insights,
            insight =>
                insight.Kind == "follow_up_due" &&
                insight.Evidence.Any(evidence => evidence.Value == dueName) &&
                insight.RecommendedAction.Href == "/clients?followUpDue=true");
    }
}
