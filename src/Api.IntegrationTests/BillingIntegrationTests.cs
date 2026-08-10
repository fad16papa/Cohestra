using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Billing;
using Cohestra.Domain.Tenants;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class BillingIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task TenantAdmin_GetBilling_ReturnsUsageAndPlanLimits()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var response = await client.GetAsync("/api/v1/admin/billing");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var summary = await response.Content.ReadFromJsonAsync<BillingSummaryResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(summary);
        Assert.Equal("Pro", summary.Plan);
        Assert.NotNull(summary.Usage);
        Assert.NotNull(summary.CoreLimits);
        Assert.NotNull(summary.ProLimits);
        Assert.Equal(3, summary.CoreLimits.Seats);
        Assert.Equal(10, summary.ProLimits.Seats);
    }

    [SkippableFact]
    public async Task TenantAdmin_CancelScheduledChange_WithoutSchedule_Returns400()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var response = await client.PostAsync(
            "/api/v1/admin/billing/subscription/cancel-scheduled-change",
            content: null);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
