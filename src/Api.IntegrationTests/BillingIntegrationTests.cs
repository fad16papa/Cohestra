using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

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

        var slug = $"bill-{Guid.NewGuid():N}"[..16];
        var ownerEmail = $"owner-{slug}@example.com";
        var invitedEmail = $"invited-{slug}@example.com";

        using var platformClient = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
        IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);
        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platformClient,
            "Billing portal owner",
            slug,
            ownerEmail);

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            var row = await db.Tenants.FirstAsync(item => item.Id == tenant.Id);
            row.Plan = TenantPlan.Pro;
            await db.SaveChangesAsync();
        }

        await IntegrationTestHelpers.CreateTenantAdminUserAsync(
            Factory.Services,
            tenant.Id,
            ownerEmail);
        var (invited, _) = await IntegrationTestHelpers.CreateTenantAdminUserAsync(
            Factory.Services,
            tenant.Id,
            invitedEmail);
        var token = IntegrationTestHelpers.MintTenantAccessToken(
            Factory.Services,
            invited,
            tenant.Id,
            TenantMembershipRole.TenantAdmin);

        using var client = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(client, slug);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var response = await client.PostAsJsonAsync(
            "/api/v1/admin/billing/portal",
            new CreatePortalSessionRequest($"http://{slug}.localhost/settings/billing"),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("managed by", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("503", body, StringComparison.Ordinal);
    }
}
