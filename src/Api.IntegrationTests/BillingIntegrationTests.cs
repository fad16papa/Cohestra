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
        Assert.False(summary.BillingConfigured);
    }

    [SkippableFact]
    public async Task TenantAdmin_Sync_WhenPaddleNotConfigured_Returns503()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var response = await client.PostAsync("/api/v1/admin/billing/sync", content: null);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [SkippableFact]
    public async Task TenantAdmin_CancelScheduledChange_WhenPaddleNotConfigured_Returns503()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var response = await client.PostAsync(
            "/api/v1/admin/billing/subscription/cancel-scheduled-change",
            content: null);
        // 29.1: money APIs 503 when Paddle is not configured. Local 400 (no schedule)
        // returns once Story 29.5 implements scheduled-change cancel.
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [SkippableFact]
    public async Task InvitedTenantAdmin_CreatePortal_Returns403OwnerManaged()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        var email = $"invited-billing-{Guid.NewGuid():N}@example.com";
        var (user, _) = await IntegrationTestHelpers.CreateTenantAdminUserAsync(
            Factory.Services,
            TenantIds.Default,
            email);
        var token = IntegrationTestHelpers.MintTenantAccessToken(
            Factory.Services,
            user,
            TenantIds.Default,
            TenantMembershipRole.TenantAdmin);

        using var client = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(client, TenantIds.DefaultSlug);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var response = await client.PostAsJsonAsync(
            "/api/v1/admin/billing/portal",
            new CreatePortalSessionRequest("http://demo.localhost/settings/billing"),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("managed by", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("503", body, StringComparison.Ordinal);
    }
}
