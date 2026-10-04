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
    private const string TenantBDraftNameMarker = "TENANT_B_SITE_NAME_MARKER";
    private const string TenantBDraftHeadlineMarker = "TENANT_B_SITE_HEADLINE_MARKER";
    private const string TenantBLiveNameMarker = "TENANT_B_LIVE_SITE_NAME_MARKER";
    private const string TenantBLiveHeadlineMarker = "TENANT_B_LIVE_HEADLINE_MARKER";

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
            new UpdateSiteDraftRequest(CreateMarkedDraft(SiteNameMarker, HeadlineMarker)),
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
            new UpdateSiteDraftRequest(CreateMarkedDraft("stolen", HeadlineMarker)),
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

    [SkippableFact]
    public async Task CoreTenantB_LegitimateHostOperations_DoNotMutateCoreTenantA_Site()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var tenantA = await CreateCoreTenantAsync("Website Isolation Host A");
        var tenantB = await CreateCoreTenantAsync("Website Isolation Host B");

        using var tenantAClient = await CreateCoreOperatorClientAsync(tenantA);
        using var tenantBClient = await CreateCoreOperatorClientAsync(tenantB);

        using var seedAGet = await tenantAClient.GetAsync("/api/v1/admin/site");
        Assert.Equal(HttpStatusCode.OK, seedAGet.StatusCode);
        using var seedAPut = await tenantAClient.PutAsJsonAsync(
            "/api/v1/admin/site",
            new UpdateSiteDraftRequest(CreateMarkedDraft(SiteNameMarker, HeadlineMarker)),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, seedAPut.StatusCode);

        var snapshotAfterA = await ReadAdminSiteAsync(tenantAClient);
        AssertSiteContains(snapshotAfterA, SiteNameMarker, HeadlineMarker, "tenant A after unpublished marker");
        AssertSiteDoesNotContain(
            snapshotAfterA,
            [TenantBDraftNameMarker, TenantBDraftHeadlineMarker, TenantBLiveNameMarker, TenantBLiveHeadlineMarker],
            "tenant A after unpublished marker");

        using var seedBGet = await tenantBClient.GetAsync("/api/v1/admin/site");
        Assert.Equal(HttpStatusCode.OK, seedBGet.StatusCode);
        using var seedBLivePut = await tenantBClient.PutAsJsonAsync(
            "/api/v1/admin/site",
            new UpdateSiteDraftRequest(CreateMarkedDraft(TenantBLiveNameMarker, TenantBLiveHeadlineMarker)),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, seedBLivePut.StatusCode);
        using var seedBPublish = await tenantBClient.PostAsync("/api/v1/admin/site/publish", content: null);
        Assert.Equal(HttpStatusCode.OK, seedBPublish.StatusCode);
        await AssertTenantAUnchangedAsync(tenantAClient, snapshotAfterA, "after tenant B first publish");

        using var seedBDraftPut = await tenantBClient.PutAsJsonAsync(
            "/api/v1/admin/site",
            new UpdateSiteDraftRequest(CreateMarkedDraft(TenantBDraftNameMarker, TenantBDraftHeadlineMarker)),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, seedBDraftPut.StatusCode);

        var tenantBAfterDraft = await ReadAdminSiteAsync(tenantBClient);
        Assert.Equal(HttpStatusCode.OK, tenantBAfterDraft.StatusCode);
        AssertSiteContains(
            tenantBAfterDraft,
            TenantBDraftNameMarker,
            TenantBDraftHeadlineMarker,
            "tenant B own GET after unpublished marker");
        AssertSiteDoesNotContain(tenantBAfterDraft, [SiteNameMarker, HeadlineMarker], "tenant B own GET");
        await AssertTenantAUnchangedAsync(tenantAClient, snapshotAfterA, "after tenant B unpublished update");

        using var tenantBPublish = await tenantBClient.PostAsync("/api/v1/admin/site/publish", content: null);
        Assert.Equal(HttpStatusCode.OK, tenantBPublish.StatusCode);
        var tenantBPublished = await ReadResponseAsync(tenantBPublish);
        AssertSiteContains(
            tenantBPublished,
            TenantBDraftNameMarker,
            TenantBDraftHeadlineMarker,
            "tenant B publish");
        AssertSiteDoesNotContain(tenantBPublished, [SiteNameMarker, HeadlineMarker], "tenant B publish");
        await AssertTenantAUnchangedAsync(tenantAClient, snapshotAfterA, "after tenant B publish");

        await AssertPublicSiteAsync(
            tenantB.Slug,
            mustContain: [TenantBDraftNameMarker, TenantBDraftHeadlineMarker],
            mustNotContain: [SiteNameMarker, HeadlineMarker],
            surface: "public tenant B after publish");
        await AssertPublicSiteAsync(
            tenantA.Slug,
            mustContain: [],
            mustNotContain:
            [
                SiteNameMarker,
                HeadlineMarker,
                TenantBDraftNameMarker,
                TenantBDraftHeadlineMarker,
                TenantBLiveNameMarker,
                TenantBLiveHeadlineMarker,
            ],
            surface: "public tenant A after B publish");

        using var tenantBRevert = await tenantBClient.PostAsync(
            "/api/v1/admin/site/revert-published",
            content: null);
        Assert.Equal(HttpStatusCode.OK, tenantBRevert.StatusCode);
        var tenantBReverted = await ReadResponseAsync(tenantBRevert);
        AssertSiteContains(
            tenantBReverted,
            TenantBLiveNameMarker,
            TenantBLiveHeadlineMarker,
            "tenant B revert");
        Assert.Contains(TenantBDraftNameMarker, tenantBReverted.Body, StringComparison.Ordinal);
        using (var revertedJson = JsonDocument.Parse(tenantBReverted.Body))
        {
            Assert.False(revertedJson.RootElement.GetProperty("canRevertPublished").GetBoolean());
            Assert.Equal(
                TenantBLiveNameMarker,
                revertedJson.RootElement.GetProperty("published").GetProperty("siteName").GetString());
            Assert.Equal(
                TenantBDraftNameMarker,
                revertedJson.RootElement.GetProperty("draft").GetProperty("siteName").GetString());
        }

        AssertSiteDoesNotContain(tenantBReverted, [SiteNameMarker, HeadlineMarker], "tenant B revert");
        await AssertTenantAUnchangedAsync(tenantAClient, snapshotAfterA, "after tenant B revert");

        await AssertPublicSiteAsync(
            tenantB.Slug,
            mustContain: [TenantBLiveNameMarker, TenantBLiveHeadlineMarker],
            mustNotContain:
            [
                SiteNameMarker,
                HeadlineMarker,
                TenantBDraftNameMarker,
                TenantBDraftHeadlineMarker,
            ],
            surface: "public tenant B after revert");
        await AssertPublicSiteAsync(
            tenantA.Slug,
            mustContain: [],
            mustNotContain:
            [
                SiteNameMarker,
                HeadlineMarker,
                TenantBDraftNameMarker,
                TenantBDraftHeadlineMarker,
                TenantBLiveNameMarker,
                TenantBLiveHeadlineMarker,
            ],
            surface: "public tenant A after B revert");
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

    private static async Task<SiteIsolationSnapshot> ReadAdminSiteAsync(HttpClient client)
    {
        using var response = await client.GetAsync("/api/v1/admin/site");
        return await ReadResponseAsync(response);
    }

    private static async Task<SiteIsolationSnapshot> ReadResponseAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        return new SiteIsolationSnapshot(response.StatusCode, body);
    }

    private async Task AssertTenantAUnchangedAsync(
        HttpClient tenantAClient,
        SiteIsolationSnapshot expected,
        string surface)
    {
        var current = await ReadAdminSiteAsync(tenantAClient);
        Assert.Equal(HttpStatusCode.OK, current.StatusCode);
        Assert.Equal(expected.Body, current.Body);
        AssertSiteContains(current, SiteNameMarker, HeadlineMarker, $"tenant A unchanged {surface}");
        AssertSiteDoesNotContain(
            current,
            [TenantBDraftNameMarker, TenantBDraftHeadlineMarker, TenantBLiveNameMarker, TenantBLiveHeadlineMarker],
            $"tenant A unchanged {surface}");
    }

    private async Task AssertPublicSiteAsync(
        string slug,
        string[] mustContain,
        string[] mustNotContain,
        string surface)
    {
        using var publicClient = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(publicClient, slug);
        using var response = await publicClient.GetAsync("/api/v1/public/site");
        var body = await response.Content.ReadAsStringAsync();
        AssertSiteDoesNotContain(new SiteIsolationSnapshot(response.StatusCode, body), mustNotContain, surface);
        if (mustContain.Length == 0)
        {
            return;
        }

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        foreach (var marker in mustContain)
        {
            Assert.Contains(marker, body, StringComparison.Ordinal);
        }
    }

    private static void AssertSiteContains(
        SiteIsolationSnapshot snapshot,
        string siteName,
        string headline,
        string surface)
    {
        Assert.Contains(siteName, snapshot.Body, StringComparison.Ordinal);
        Assert.Contains(headline, snapshot.Body, StringComparison.Ordinal);
        _ = surface;
    }

    private static void AssertSiteDoesNotContain(
        SiteIsolationSnapshot snapshot,
        string[] markers,
        string surface)
    {
        foreach (var marker in markers)
        {
            Assert.DoesNotContain(marker, snapshot.Body, StringComparison.Ordinal);
        }

        _ = surface;
    }

    private static SiteSectionsDocumentDto CreateMarkedDraft(string siteName, string headline)
    {
        using var propsDocument = JsonDocument.Parse(
            $$"""
            {
              "headline": "{{headline}}",
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

    private sealed record SiteIsolationSnapshot(HttpStatusCode StatusCode, string Body);

    private sealed record CoreIsolationTenant(
        Guid Id,
        string Slug,
        string AdminEmail,
        string Password);
}
