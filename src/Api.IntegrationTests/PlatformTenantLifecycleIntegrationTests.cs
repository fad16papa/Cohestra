using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Auth;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Collection(IntegrationTestCollection.Name)]
[Trait("Category", "Integration")]
public sealed class PlatformTenantLifecycleIntegrationTests(IntegrationTestFixture fixture)
{
    [SkippableFact]
    public async Task Platform_admin_can_lifecycle_tenant_operator_gets_403()
    {
        IntegrationTestHelpers.SkipIfUnavailable(fixture.Factory);

        using var operatorClient = fixture.Factory.CreateClient();
        var operatorToken = await IntegrationTestHelpers.LoginAsOperatorAsync(operatorClient);
        IntegrationTestHelpers.UseBearerToken(operatorClient, operatorToken);

        using var forbiddenResponse = await operatorClient.PostAsJsonAsync(
            "/api/v1/platform/tenants",
            new CreateTenantRequest("Forbidden Org", "forbidden-org", "Basic", "admin@forbidden.test"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenResponse.StatusCode);

        using var platformClient = fixture.Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
        IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);

        var slug = $"plat-{Guid.NewGuid():N}"[..12];
        using var createResponse = await platformClient.PostAsJsonAsync(
            "/api/v1/platform/tenants",
            new CreateTenantRequest("Platform Org", slug, "Basic", "admin@platform-org.test"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var created = await createResponse.Content.ReadFromJsonAsync<TenantResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(created);
        Assert.Equal(TenantStatus.Active.ToString(), created.Status);

        using var suspendResponse = await platformClient.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{created.Id}/suspend",
            new SuspendTenantRequest("Abuse report — ToS freeze"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, suspendResponse.StatusCode);
        var suspended = await suspendResponse.Content.ReadFromJsonAsync<TenantResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.Equal(TenantStatus.Suspended.ToString(), suspended!.Status);

        using var reactivateResponse = await platformClient.PostAsync(
            $"/api/v1/platform/tenants/{created.Id}/reactivate",
            null);
        Assert.Equal(HttpStatusCode.OK, reactivateResponse.StatusCode);

        using var archiveResponse = await platformClient.PostAsync(
            $"/api/v1/platform/tenants/{created.Id}/archive",
            null);
        Assert.Equal(HttpStatusCode.OK, archiveResponse.StatusCode);
        var archived = await archiveResponse.Content.ReadFromJsonAsync<TenantResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.Equal(TenantStatus.Archived.ToString(), archived!.Status);
        Assert.NotNull(archived.ArchivedAt);

        await using var scope = fixture.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var auditCount = await db.PlatformAuditLogs.CountAsync(a => a.TenantId == created.Id);
        Assert.True(auditCount >= 4);
    }

    [SkippableFact]
    public async Task Unauthenticated_platform_create_returns_401()
    {
        IntegrationTestHelpers.SkipIfUnavailable(fixture.Factory);

        using var client = fixture.Factory.CreateClient();
        using var response = await client.PostAsJsonAsync(
            "/api/v1/platform/tenants",
            new CreateTenantRequest("No Auth", "no-auth-org", "Basic", "a@b.co"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [SkippableFact]
    public async Task Platform_admin_can_set_and_clear_complimentary_tenant_admin_gets_403()
    {
        IntegrationTestHelpers.SkipIfUnavailable(fixture.Factory);

        using var platformClient = fixture.Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
        IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);

        var slug = $"comp-{Guid.NewGuid():N}"[..12];
        using var createResponse = await platformClient.PostAsJsonAsync(
            "/api/v1/platform/tenants",
            new CreateTenantRequest("Complimentary Org", slug, "Basic", "admin@comp-org.test"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<TenantResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(created);

        using var operatorClient = fixture.Factory.CreateClient();
        var operatorToken = await IntegrationTestHelpers.LoginAsOperatorAsync(operatorClient);
        IntegrationTestHelpers.UseBearerToken(operatorClient, operatorToken);

        using var forbiddenResponse = await operatorClient.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{created.Id}/complimentary",
            new SetComplimentaryRequest(true, "Pro", "should fail"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenResponse.StatusCode);

        using var setResponse = await platformClient.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{created.Id}/complimentary",
            new SetComplimentaryRequest(true, "Pro", "Pilot"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, setResponse.StatusCode);
        var sponsored = await setResponse.Content.ReadFromJsonAsync<TenantResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.True(sponsored!.IsComplimentary);
        Assert.Equal(TenantPlan.Pro.ToString(), sponsored.Plan);
        Assert.Equal(BillingStatus.Free.ToString(), sponsored.BillingStatus);

        using var clearResponse = await platformClient.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{created.Id}/complimentary",
            new SetComplimentaryRequest(false, null, "Convert"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, clearResponse.StatusCode);
        var cleared = await clearResponse.Content.ReadFromJsonAsync<TenantResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.False(cleared!.IsComplimentary);
        Assert.Equal(TenantPlan.Pro.ToString(), cleared.Plan);

        await using var scope = fixture.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var actions = await db.PlatformAuditLogs
            .Where(a => a.TenantId == created.Id)
            .Select(a => a.Action)
            .ToListAsync();
        Assert.Contains(PlatformAuditAction.ComplimentarySet, actions);
        Assert.Contains(PlatformAuditAction.ComplimentaryCleared, actions);
    }
}
