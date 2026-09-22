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

[Trait("Category", "Integration")]
[Trait("Category", "TenantIsolation")]
[Collection(IntegrationTestCollection.Name)]
public sealed class AdminSiteEntitlementIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task AdminSite_Get_BasicTenantAdmin_Returns403PlanLocked()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = await CreateTenantAdminClientAsync(TenantPlan.Basic);
        using var response = await client.GetAsync("/api/v1/admin/site");

        await AssertPlanLockedAsync(response);
    }

    [SkippableFact]
    public async Task AdminSite_Put_BasicTenantAdmin_Returns403PlanLocked()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = await CreateTenantAdminClientAsync(TenantPlan.Basic);
        using var response = await client.PutAsJsonAsync(
            "/api/v1/admin/site",
            new UpdateSiteDraftRequest(CreateMinimalDraft()),
            IntegrationTestHelpers.JsonOptions);

        await AssertPlanLockedAsync(response);
    }

    [SkippableFact]
    public async Task AdminSite_PreviewToken_BasicTenantAdmin_Returns403PlanLocked()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = await CreateTenantAdminClientAsync(TenantPlan.Basic);
        using var response = await client.PostAsync("/api/v1/admin/site/preview-token", content: null);

        await AssertPlanLockedAsync(response);
    }

    [SkippableFact]
    public async Task AdminSite_Get_CoreTenantAdmin_Returns200AndCreatesSite()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = await CreateTenantAdminClientAsync(TenantPlan.Core);
        using var response = await client.GetAsync("/api/v1/admin/site");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<SitePageAdminResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(body);
        Assert.NotNull(body.Draft);
    }

    [SkippableFact]
    public async Task AdminSite_Get_ProTenantAdmin_Returns200()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var response = await client.GetAsync("/api/v1/admin/site");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [SkippableFact]
    public async Task AdminSite_Get_Unauthenticated_Returns401()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        using var response = await client.GetAsync("/api/v1/admin/site");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var errorCode = await TryReadErrorCodeAsync(response);
        Assert.NotEqual("plan_locked", errorCode);
    }

    [SkippableFact]
    public async Task AdminSite_Get_PlatformAdmin_Returns403WithoutPlanLocked()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var response = await client.GetAsync("/api/v1/admin/site");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var errorCode = await TryReadErrorCodeAsync(response);
        Assert.NotEqual("plan_locked", errorCode);
    }

    [SkippableFact]
    public async Task AdminSite_Get_ProTenantMember_Returns200()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var client = await CreateDefaultTenantMemberClientAsync();
        using var response = await client.GetAsync("/api/v1/admin/site");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [SkippableFact]
    public async Task AdminSite_Get_BasicTenantMember_Returns403PlanLocked()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = await CreateTenantMemberClientAsync(TenantPlan.Basic);
        using var response = await client.GetAsync("/api/v1/admin/site");

        await AssertPlanLockedAsync(response);
    }

    [SkippableFact]
    public async Task AdminSite_Get_BasicTokenOnDefaultHost_DoesNotReturnDefaultSite()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        var (token, slug) = await CreateTenantAdminTokenAsync(TenantPlan.Basic);
        using var mismatched = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(mismatched, TenantIds.DefaultSlug);
        IntegrationTestHelpers.UseBearerToken(mismatched, token);

        using var response = await mismatched.GetAsync("/api/v1/admin/site");
        Assert.True(
            response.StatusCode is HttpStatusCode.Unauthorized
                or HttpStatusCode.Forbidden
                or HttpStatusCode.NotFound,
            $"Expected isolation denial, got {(int)response.StatusCode}.");

        if (response.StatusCode == HttpStatusCode.OK)
        {
            Assert.Fail("Basic tenant token must not read the default tenant Website.");
        }

        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(slug, body, StringComparison.Ordinal);
    }

    private async Task<HttpClient> CreateTenantAdminClientAsync(TenantPlan plan)
    {
        var (token, slug) = await CreateTenantAdminTokenAsync(plan);
        var client = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(client, slug);
        IntegrationTestHelpers.UseBearerToken(client, token);
        return client;
    }

    private async Task<(string Token, string Slug)> CreateTenantAdminTokenAsync(TenantPlan plan)
    {
        var slug = $"site-{Guid.NewGuid():N}"[..16];
        var adminEmail = $"admin-{slug}@example.com";

        using var platformClient = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
        IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);

        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platformClient,
            "Website entitlement",
            slug,
            adminEmail);

        if (plan != TenantPlan.Basic)
        {
            await SetTenantPlanAsync(tenant.Id, plan);
        }

        var (_, password) = await IntegrationTestHelpers.CreateTenantAdminUserAsync(
            Factory.Services,
            tenant.Id,
            adminEmail);

        using var loginClient = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(loginClient, slug);
        var token = await IntegrationTestHelpers.LoginAsync(loginClient, adminEmail, password);
        return (token, slug);
    }

    private async Task<HttpClient> CreateTenantMemberClientAsync(TenantPlan plan)
    {
        var slug = $"mem-{Guid.NewGuid():N}"[..16];
        var adminEmail = $"admin-{slug}@example.com";
        var memberEmail = $"member-{slug}@example.com";

        using var platformClient = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
        IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);

        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platformClient,
            "Website member entitlement",
            slug,
            adminEmail);

        if (plan != TenantPlan.Basic)
        {
            await SetTenantPlanAsync(tenant.Id, plan);
        }

        var (member, password) = await IntegrationTestHelpers.CreateTenantMemberUserAsync(
            Factory.Services,
            tenant.Id,
            memberEmail);

        var token = IntegrationTestHelpers.MintTenantAccessToken(
            Factory.Services,
            member,
            tenant.Id,
            TenantMembershipRole.TenantMember);

        var client = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(client, slug);
        IntegrationTestHelpers.UseBearerToken(client, token);
        _ = password;
        return client;
    }

    private async Task<HttpClient> CreateDefaultTenantMemberClientAsync()
    {
        var email = $"member-{Guid.NewGuid():N}@example.com";
        var (user, _) = await IntegrationTestHelpers.CreateTenantMemberUserAsync(
            Factory.Services,
            TenantIds.Default,
            email);

        var token = IntegrationTestHelpers.MintTenantAccessToken(
            Factory.Services,
            user,
            TenantIds.Default,
            TenantMembershipRole.TenantMember);

        var client = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(client, TenantIds.DefaultSlug);
        IntegrationTestHelpers.UseBearerToken(client, token);
        return client;
    }

    private async Task SetTenantPlanAsync(Guid tenantId, TenantPlan plan)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var tenant = await db.Tenants.SingleAsync(item => item.Id == tenantId);
        tenant.Plan = plan;
        tenant.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
    }

    private static async Task AssertPlanLockedAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var mediaType = response.Content.Headers.ContentType?.MediaType;
        Assert.True(
            string.Equals(mediaType, "application/problem+json", StringComparison.OrdinalIgnoreCase)
                || string.Equals(mediaType, "application/json", StringComparison.OrdinalIgnoreCase),
            $"Expected ProblemDetails JSON, got {mediaType}.");

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = document.RootElement;
        Assert.Equal("plan_locked", ReadString(root, "errorCode"));
        Assert.Equal("website", ReadString(root, "feature"));
        Assert.Equal("Core", ReadString(root, "requiredPlan"));
        var detail = ReadString(root, "detail") ?? ReadString(root, "Detail");
        Assert.Contains("Core", detail, StringComparison.OrdinalIgnoreCase);
    }

    private static async Task<string?> TryReadErrorCodeAsync(HttpResponseMessage response)
    {
        var raw = await response.Content.ReadAsStringAsync();
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(raw);
            return ReadString(document.RootElement, "errorCode");
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string? ReadString(JsonElement root, string name)
    {
        if (root.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String)
        {
            return value.GetString();
        }

        if (root.TryGetProperty("extensions", out var extensions)
            && extensions.ValueKind == JsonValueKind.Object
            && extensions.TryGetProperty(name, out var nested)
            && nested.ValueKind == JsonValueKind.String)
        {
            return nested.GetString();
        }

        return null;
    }

    private static SiteSectionsDocumentDto CreateMinimalDraft() =>
        new(
            SchemaVersion: 1,
            SiteName: "Locked",
            AccentColor: null,
            LogoAssetId: null,
            PresetId: null,
            Sections: []);
}
