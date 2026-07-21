using System.Net;
using System.Net.Http.Json;
using System.Text;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Platform;
using Cohestra.Contracts.Site;
using Cohestra.Domain.Registrations;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

/// <summary>
/// SM-1 / AD-10 TenantIsolation gate — cross-tenant negative cases required on every PR to main.
/// </summary>
[Trait("Category", "Integration")]
[Trait("Category", "TenantIsolation")]
[Collection(IntegrationTestCollection.Name)]
public sealed class TenantIsolationApiTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task Admin_GetActivity_ByForeignTenantId_Returns404Or403_NeverForeignPayload()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var tenantB = await CreateForeignTenantAsync();
        const string foreignMarker = "TENANT_B_ISOLATION_ACTIVITY_MARKER";
        var foreignSlug = $"iso-b-{Guid.NewGuid():N}"[..20];
        var foreignActivity = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            tenantB.Id,
            foreignSlug,
            foreignMarker);

        var ownSlug = $"iso-a-own-{Guid.NewGuid():N}"[..20];
        var ownActivity = await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, ownSlug);

        using var adminClient = Factory.CreateClient();
        // Default Host (localhost) + default operator JWT = Tenant A (Platform 0).
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

        using var ownResponse = await adminClient.GetAsync($"/api/v1/admin/activities/{ownActivity.Id}");
        Assert.Equal(HttpStatusCode.OK, ownResponse.StatusCode);

        using var response = await adminClient.GetAsync($"/api/v1/admin/activities/{foreignActivity.Id}");

        Assert.True(
            response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Forbidden,
            $"Expected 404 or 403 for cross-tenant activity GET, got {(int)response.StatusCode}.");

        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(foreignMarker, body, StringComparison.Ordinal);
        Assert.DoesNotContain(foreignSlug, body, StringComparison.Ordinal);
    }

    [SkippableFact]
    public async Task PublicSite_ForDefaultTenant_DoesNotReturnForeignTenantActivities()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var tenantB = await CreateForeignTenantAsync();
        const string foreignMarker = "TENANT_B_PUBLIC_SITE_MARKER";
        var foreignSlug = $"iso-pub-{Guid.NewGuid():N}"[..20];
        await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            tenantB.Id,
            foreignSlug,
            foreignMarker);

        var visibleSlug = $"iso-a-{Guid.NewGuid():N}"[..20];
        await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, visibleSlug);

        using var adminClient = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);
        await IntegrationTestHelpers.EnsureDefaultSitePublishedAsync(adminClient);

        using var publicClient = Factory.CreateClient();
        using var siteResponse = await publicClient.GetAsync("/api/v1/public/site");
        siteResponse.EnsureSuccessStatusCode();

        var site = await siteResponse.Content.ReadFromJsonAsync<PublicSiteResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(site);
        Assert.Contains(site.UpcomingActivities, activity => activity.Slug == visibleSlug);
        Assert.DoesNotContain(
            site.UpcomingActivities,
            activity =>
                activity.Slug == foreignSlug ||
                activity.Name.Contains(foreignMarker, StringComparison.Ordinal));

        using var activityResponse = await publicClient.GetAsync($"/api/v1/public/activities/{foreignSlug}");
        Assert.Equal(HttpStatusCode.NotFound, activityResponse.StatusCode);
        var activityBody = await activityResponse.Content.ReadAsStringAsync();
        Assert.DoesNotContain(foreignMarker, activityBody, StringComparison.Ordinal);
    }

    [SkippableFact]
    public async Task Admin_ReportExport_ForDefaultTenant_ExcludesForeignTenantMarkers()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var tenantB = await CreateForeignTenantAsync();
        const string foreignEmail = "bob-b@isolation-b-api.test";
        const string foreignName = "TENANT_B_EXPORT_API_MARKER";
        var foreignSlug = $"iso-exp-{Guid.NewGuid():N}"[..20];
        var foreignActivity = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            tenantB.Id,
            foreignSlug,
            foreignName);

        var foreignClient = await IntegrationTestHelpers.SeedClientAsync(
            Factory.Services,
            client =>
            {
                client.TenantId = tenantB.Id;
                client.FullName = foreignName;
                client.Email = foreignEmail;
                client.NormalizedEmail = foreignEmail;
            });

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            db.Registrations.Add(new Registration
            {
                Id = Guid.NewGuid(),
                TenantId = tenantB.Id,
                RegistrationNumber = "REG-B-API-ISOLATION-001",
                ActivityId = foreignActivity.Id,
                ClientId = foreignClient.Id,
                CreatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        const string tenantAExportMarker = "TENANT_A_EXPORT_API_MARKER";
        const string tenantARegNumber = "REG-A-API-ISOLATION-001";
        var tenantAActivity = await IntegrationTestHelpers.SeedPublishedActivityAsync(
            Factory.Services,
            $"iso-a-exp-{Guid.NewGuid():N}"[..20]);
        var tenantAClient = await IntegrationTestHelpers.SeedClientAsync(
            Factory.Services,
            client =>
            {
                client.TenantId = TenantIds.Default;
                client.FullName = tenantAExportMarker;
                client.Email = "alice-a@isolation-a-api.test";
                client.NormalizedEmail = "alice-a@isolation-a-api.test";
            });

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            db.Registrations.Add(new Registration
            {
                Id = Guid.NewGuid(),
                TenantId = TenantIds.Default,
                RegistrationNumber = tenantARegNumber,
                ActivityId = tenantAActivity.Id,
                ClientId = tenantAClient.Id,
                CreatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        using var adminClient = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

        var from = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7));
        var to = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        using var exportResponse = await adminClient.GetAsync(
            $"/api/v1/admin/reports/export?preset=custom&from={from:yyyy-MM-dd}&to={to:yyyy-MM-dd}");
        exportResponse.EnsureSuccessStatusCode();

        var csv = Encoding.UTF8.GetString(await exportResponse.Content.ReadAsByteArrayAsync());
        Assert.Contains(tenantAExportMarker, csv, StringComparison.Ordinal);
        Assert.Contains(tenantARegNumber, csv, StringComparison.Ordinal);
        Assert.DoesNotContain(foreignName, csv, StringComparison.Ordinal);
        Assert.DoesNotContain(foreignEmail, csv, StringComparison.Ordinal);
        Assert.DoesNotContain("REG-B-API-ISOLATION-001", csv, StringComparison.Ordinal);
        Assert.DoesNotContain(foreignSlug, csv, StringComparison.Ordinal);
    }

    private async Task<TenantResponse> CreateForeignTenantAsync()
    {
        using var platformClient = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
        IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);

        var slug = $"iso-{Guid.NewGuid():N}"[..12];
        return await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platformClient,
            "Isolation Tenant B",
            slug,
            $"admin@{slug}.test");
    }
}
