using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Tenants;

namespace Cohestra.Api.IntegrationTests;

[Collection(IntegrationTestCollection.Name)]
[Trait("Category", "Integration")]
public sealed class PlatformOpsOverviewIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task PlatformAdmin_overview_returns_provenance_and_matches_directory_hide()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        var visibleSlug = $"ov-{Guid.NewGuid():N}"[..12];
        var loadSlug = $"load-{Guid.NewGuid():N}"[..12];
        await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            client,
            "Overview Visible Org",
            visibleSlug,
            $"admin-{visibleSlug}@overview.test");
        await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            client,
            "Overview Load Org",
            loadSlug,
            $"admin-{loadSlug}@overview.test");

        using var hiddenList = await client.GetAsync("/api/v1/platform/tenants?hideLoadTest=true&page=1&pageSize=100");
        hiddenList.EnsureSuccessStatusCode();
        var directory = await hiddenList.Content.ReadFromJsonAsync<TenantListResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(directory);
        Assert.DoesNotContain(directory.Items, item => item.Slug.StartsWith("load-", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(directory.Items, item => item.Slug == TenantIds.DefaultSlug);

        using var overviewResponse = await client.GetAsync("/api/v1/platform/ops/overview");
        Assert.Equal(HttpStatusCode.OK, overviewResponse.StatusCode);
        var body = await overviewResponse.Content.ReadAsStringAsync();
        var overview = JsonSerializer.Deserialize<PlatformOpsOverviewResponse>(
            body,
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(overview);
        Assert.Equal(PlatformKpiFreshness.Actual, overview.TenantStatusCounts.Freshness);
        Assert.Equal(PlatformKpiSources.Tenants, overview.TenantStatusCounts.Source);
        Assert.Equal(directory.TotalCount, overview.TenantStatusCounts.Value!.Sum(row => row.Count));
        Assert.Equal(PlatformKpiFreshness.Actual, overview.OpenSupportCount.Freshness);
        Assert.Equal(PlatformKpiSources.SupportIssues, overview.OpenSupportCount.Source);
        Assert.Equal(PlatformKpiFreshness.Actual, overview.StackHealth.Freshness);
        Assert.Equal(PlatformKpiSources.HealthChecks, overview.StackHealth.Source);
        Assert.Contains(
            overview.StackHealth.Value,
            new[]
            {
                PlatformHealthStatuses.Healthy,
                PlatformHealthStatuses.Degraded,
                PlatformHealthStatuses.Unhealthy,
            });
        Assert.True(overview.TenantStatusCounts.ObservedAt.UtcDateTime <= DateTime.UtcNow.AddMinutes(1));
        Assert.Equal(TimeSpan.Zero, overview.TenantStatusCounts.ObservedAt.Offset);
        Assert.DoesNotContain(visibleSlug, body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("green", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Password=", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("redis://", body, StringComparison.OrdinalIgnoreCase);

        using var shown = await client.GetAsync("/api/v1/platform/ops/overview?hideLoadTest=false");
        shown.EnsureSuccessStatusCode();
        var all = await shown.Content.ReadFromJsonAsync<PlatformOpsOverviewResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(all);
        Assert.True(all.TenantStatusCounts.Value!.Sum(row => row.Count) > overview.TenantStatusCounts.Value!.Sum(row => row.Count));
    }

    [SkippableFact]
    public async Task Anonymous_overview_is_unauthorized()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        using var response = await client.GetAsync("/api/v1/platform/ops/overview");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
