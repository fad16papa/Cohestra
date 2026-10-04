using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Site;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

/// <summary>
/// Same-entitlement Core-to-Core isolation for Website Studio admin site APIs.
/// A Basic JWT is not sufficient because the Core plan gate can reject before tenant lookup.
/// </summary>
[Trait("Category", "Integration")]
[Trait("Category", "TenantIsolation")]
[Collection(IntegrationTestCollection.Name)]
public sealed class SiteIsolationIntegrationTests(IntegrationTestFixture fixture)
{
    private const string SiteNameMarker = "TENANT_A_SITE_NAME_MARKER";
    private const string HeadlineMarker = "TENANT_A_SITE_HEADLINE_MARKER";

    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task CoreTenantB_CannotReadOrUpdate_CoreTenantA_Site()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var tenantA = await CreateCoreTenantAsync("Website Isolation A");
        var tenantB = await CreateCoreTenantAsync("Website Isolation B");

        using var tenantAClient = await CreateCoreOperatorClientAsync(tenantA);
        using var seedGet = await tenantAClient.GetAsync("/api/v1/admin/site");
        Assert.Equal(HttpStatusCode.OK, seedGet.StatusCode);

        using var seedPut = await tenantAClient.PutAsJsonAsync(
            "/api/v1/admin/site",
            new UpdateSiteDraftRequest(CreateMarkedDraft()),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, seedPut.StatusCode);
        var seededBody = await seedPut.Content.ReadAsStringAsync();
        Assert.Contains(SiteNameMarker, seededBody, StringComparison.Ordinal);
        Assert.Contains(HeadlineMarker, seededBody, StringComparison.Ordinal);

        using var tenantBOnA = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(tenantBOnA, tenantA.Slug);
        var tenantBToken = await LoginCoreOperatorAsync(tenantB);
        IntegrationTestHelpers.UseBearerToken(tenantBOnA, tenantBToken);

        using var foreignGet = await tenantBOnA.GetAsync("/api/v1/admin/site");
        await AssertDeniedWithoutLeakAsync(foreignGet, "site get");

        using var foreignPut = await tenantBOnA.PutAsJsonAsync(
            "/api/v1/admin/site",
            new UpdateSiteDraftRequest(CreateMarkedDraft(siteName: "stolen")),
            IntegrationTestHelpers.JsonOptions);
        await AssertDeniedWithoutLeakAsync(foreignPut, "site put");

        using var foreignPublish = await tenantBOnA.PostAsync("/api/v1/admin/site/publish", content: null);
        await AssertDeniedWithoutLeakAsync(foreignPublish, "site publish");

        using var foreignRevert = await tenantBOnA.PostAsync(
            "/api/v1/admin/site/revert-published",
            content: null);
        await AssertDeniedWithoutLeakAsync(foreignRevert, "site revert");

        using var tenantBClient = await CreateCoreOperatorClientAsync(tenantB);
        using var ownGet = await tenantBClient.GetAsync("/api/v1/admin/site");
        Assert.Equal(HttpStatusCode.OK, ownGet.StatusCode);
        await AssertNoLeakAsync(await ownGet.Content.ReadAsStringAsync(), "tenant B own site");

        using var stillOwn = await tenantAClient.GetAsync("/api/v1/admin/site");
        Assert.Equal(HttpStatusCode.OK, stillOwn.StatusCode);
        var stillOwnBody = await stillOwn.Content.ReadAsStringAsync();
        Assert.Contains(SiteNameMarker, stillOwnBody, StringComparison.Ordinal);
        Assert.Contains(HeadlineMarker, stillOwnBody, StringComparison.Ordinal);
    }

    private async Task<CoreIsolationTenant> CreateCoreTenantAsync(string name)
    {
        var slug = $"site-{Guid.NewGuid():N}"[..16];
        var adminEmail = $"admin-{slug}@example.com";

        using var platformClient = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
        IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);

        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platformClient,
            name,
            slug,
            adminEmail);

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            var row = await db.Tenants.SingleAsync(item => item.Id == tenant.Id);
            row.Plan = TenantPlan.Core;
            row.AdminContactEmail = adminEmail;
            row.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
        }

        var (_, password) = await IntegrationTestHelpers.CreateTenantAdminUserAsync(
            Factory.Services,
            tenant.Id,
            adminEmail);

        return new CoreIsolationTenant(tenant.Id, slug, adminEmail, password);
    }

    private async Task<HttpClient> CreateCoreOperatorClientAsync(CoreIsolationTenant tenant)
    {
        var client = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(client, tenant.Slug);
        var token = await LoginCoreOperatorAsync(tenant);
        IntegrationTestHelpers.UseBearerToken(client, token);
        return client;
    }

    private async Task<string> LoginCoreOperatorAsync(CoreIsolationTenant tenant)
    {
        using var client = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(client, tenant.Slug);
        return await IntegrationTestHelpers.LoginAsync(client, tenant.AdminEmail, tenant.Password);
    }

    private static async Task AssertDeniedWithoutLeakAsync(HttpResponseMessage response, string surface)
    {
        Assert.True(
            response.StatusCode is HttpStatusCode.Unauthorized
                or HttpStatusCode.Forbidden
                or HttpStatusCode.NotFound,
            $"Expected 401/403/404 for {surface}, got {(int)response.StatusCode}.");
        await AssertNoLeakAsync(await response.Content.ReadAsStringAsync(), surface);
    }

    private static Task AssertNoLeakAsync(string body, string surface)
    {
        Assert.DoesNotContain(SiteNameMarker, body, StringComparison.Ordinal);
        Assert.DoesNotContain(HeadlineMarker, body, StringComparison.Ordinal);
        _ = surface;
        return Task.CompletedTask;
    }

    private static SiteSectionsDocumentDto CreateMarkedDraft(string siteName = SiteNameMarker)
    {
        using var propsDocument = JsonDocument.Parse(
            $$"""
            {
              "headline": "{{HeadlineMarker}}",
              "primaryCta": { "label": "Browse events", "target": "scroll-upcoming" }
            }
            """);
        var props = JsonSerializer.Deserialize<JsonElement>(propsDocument.RootElement.GetRawText());

        return new SiteSectionsDocumentDto(
            SchemaVersion: 1,
            SiteName: siteName,
            AccentColor: "#c45c26",
            LogoAssetId: null,
            PresetId: "community",
            Sections:
            [
                new SiteSectionDto("hero-1", "hero", true, 0, props),
            ]);
    }

    private sealed record CoreIsolationTenant(
        Guid Id,
        string Slug,
        string AdminEmail,
        string Password);
}
