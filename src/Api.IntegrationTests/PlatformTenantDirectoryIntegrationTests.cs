using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Platform;

namespace Cohestra.Api.IntegrationTests;

[Collection(IntegrationTestCollection.Name)]
[Trait("Category", "Integration")]
public sealed class PlatformTenantDirectoryIntegrationTests(IntegrationTestFixture fixture)
{
    [SkippableFact]
    public async Task Platform_admin_can_list_and_get_detail_operator_gets_403()
    {
        IntegrationTestHelpers.SkipIfUnavailable(fixture.Factory);

        using var operatorClient = fixture.Factory.CreateClient();
        var operatorToken = await IntegrationTestHelpers.LoginAsOperatorAsync(operatorClient);
        IntegrationTestHelpers.UseBearerToken(operatorClient, operatorToken);

        using var forbiddenList = await operatorClient.GetAsync("/api/v1/platform/tenants");
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenList.StatusCode);

        using var platformClient = fixture.Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
        IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);

        var slug = $"dir-{Guid.NewGuid():N}"[..12];
        using var createResponse = await platformClient.PostAsJsonAsync(
            "/api/v1/platform/tenants",
            new CreateTenantRequest("Directory Org", slug, "Basic", "admin@directory-org.test"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<TenantResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(created);

        using var listResponse = await platformClient.GetAsync(
            $"/api/v1/platform/tenants?search={slug}&page=1&pageSize=25");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var list = await listResponse.Content.ReadFromJsonAsync<TenantListResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(list);
        Assert.Contains(list.Items, item => item.Id == created.Id && item.Slug == slug);

        using var detailResponse = await platformClient.GetAsync(
            $"/api/v1/platform/tenants/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, detailResponse.StatusCode);
        var detail = await detailResponse.Content.ReadFromJsonAsync<TenantDetailResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(detail);
        Assert.Equal(created.Id, detail.Tenant.Id);
        Assert.NotEmpty(detail.RecentAudits);

        using var meResponse = await platformClient.GetAsync("/api/v1/platform/me");
        Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);
        var me = await meResponse.Content.ReadFromJsonAsync<PlatformProfileResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(me);
        Assert.Contains("PlatformAdmin", me.Roles);

        using var forbiddenDetail = await operatorClient.GetAsync(
            $"/api/v1/platform/tenants/{created.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenDetail.StatusCode);
    }

    [SkippableFact]
    public async Task Ready_endpoint_remains_anonymous()
    {
        IntegrationTestHelpers.SkipIfUnavailable(fixture.Factory);

        using var client = fixture.Factory.CreateClient();
        using var response = await client.GetAsync("/ready");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
