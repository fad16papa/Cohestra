using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Tenants;

namespace Cohestra.Api.IntegrationTests;

[Collection(IntegrationTestCollection.Name)]
[Trait("Category", "Integration")]
public sealed class PlatformOpsVersionIntegrationTests(IntegrationTestFixture fixture)
{
    private const string InstrumentedSha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task Version_is_staff_only_and_public_info_stays_frozen()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var anonymous = Factory.CreateClient();
        using var anonVersion = await anonymous.GetAsync("/api/v1/platform/ops/version");
        Assert.Equal(HttpStatusCode.Unauthorized, anonVersion.StatusCode);

        using var info = await anonymous.GetAsync("/api/v1/system/info");
        Assert.Equal(HttpStatusCode.OK, info.StatusCode);
        var infoJson = await info.Content.ReadAsStringAsync();
        using var infoDoc = JsonDocument.Parse(infoJson);
        Assert.Equal("Cohestra", infoDoc.RootElement.GetProperty("name").GetString()
            ?? infoDoc.RootElement.GetProperty("Name").GetString());
        Assert.Equal("v1", infoDoc.RootElement.GetProperty("apiVersion").GetString()
            ?? infoDoc.RootElement.GetProperty("ApiVersion").GetString());
        AssertPublicInfoUnchanged(infoJson);

        using var ready = await anonymous.GetAsync("/ready");
        var readyJson = await ready.Content.ReadAsStringAsync();
        Assert.DoesNotContain("gitSha", readyJson, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("GIT_SHA", readyJson, StringComparison.Ordinal);

        using var tenantAdmin = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(tenantAdmin, await IntegrationTestHelpers.LoginAsOperatorAsync(tenantAdmin));
        using var adminVersion = await tenantAdmin.GetAsync("/api/v1/platform/ops/version");
        Assert.Equal(HttpStatusCode.Forbidden, adminVersion.StatusCode);

        var (member, _) = await IntegrationTestHelpers.CreateTenantMemberUserAsync(
            Factory.Services,
            TenantIds.Default,
            $"version-member-{Guid.NewGuid():N}@example.com");
        using var tenantMember = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(tenantMember, TenantIds.DefaultSlug);
        IntegrationTestHelpers.UseBearerToken(
            tenantMember,
            IntegrationTestHelpers.MintTenantAccessToken(
                Factory.Services,
                member,
                TenantIds.Default,
                TenantMembershipRole.TenantMember));
        using var memberVersion = await tenantMember.GetAsync("/api/v1/platform/ops/version");
        Assert.Equal(HttpStatusCode.Forbidden, memberVersion.StatusCode);

        using var platform = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(platform, await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platform));
        using var missing = await platform.GetAsync("/api/v1/platform/ops/version");
        Assert.Equal(HttpStatusCode.OK, missing.StatusCode);
        var missingJson = await missing.Content.ReadAsStringAsync();
        var missingBody = JsonSerializer.Deserialize<PlatformOpsVersionResponse>(
            missingJson,
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(missingBody);
        Assert.Null(missingBody.GitSha.Value);
        Assert.Equal(PlatformKpiFreshness.MissingInstrumentation, missingBody.GitSha.Freshness);
        Assert.Equal("v1", missingBody.ApiVersion.Value);
        Assert.False(string.IsNullOrWhiteSpace(missingBody.EnvironmentName.Value));
        Assert.DoesNotContain("SigningKey", missingJson, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Password", missingJson, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("ApiKey", missingJson, StringComparison.OrdinalIgnoreCase);

        using var instrumentedFactory = Factory.WithWebHostBuilder(builder =>
            builder.UseSetting("GIT_SHA", InstrumentedSha));
        using var instrumentedClient = instrumentedFactory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(
            instrumentedClient,
            await IntegrationTestHelpers.LoginAsPlatformAdminAsync(instrumentedClient));
        using var actual = await instrumentedClient.GetAsync("/api/v1/platform/ops/version");
        Assert.Equal(HttpStatusCode.OK, actual.StatusCode);
        var actualBody = await actual.Content.ReadFromJsonAsync<PlatformOpsVersionResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.Equal(InstrumentedSha, actualBody!.GitSha.Value);
        Assert.Equal(PlatformKpiFreshness.Actual, actualBody.GitSha.Freshness);
        Assert.Equal(PlatformKpiSources.GitSha, actualBody.GitSha.Source);

        using var malformedFactory = Factory.WithWebHostBuilder(builder =>
            builder.UseSetting("GIT_SHA", "latest"));
        using var malformedClient = malformedFactory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(
            malformedClient,
            await IntegrationTestHelpers.LoginAsPlatformAdminAsync(malformedClient));
        using var malformed = await malformedClient.GetAsync("/api/v1/platform/ops/version");
        Assert.Equal(HttpStatusCode.OK, malformed.StatusCode);
        var malformedJson = await malformed.Content.ReadAsStringAsync();
        var malformedBody = JsonSerializer.Deserialize<PlatformOpsVersionResponse>(
            malformedJson,
            IntegrationTestHelpers.JsonOptions);
        Assert.Null(malformedBody!.GitSha.Value);
        Assert.Equal(PlatformKpiFreshness.Unavailable, malformedBody.GitSha.Freshness);
        Assert.Equal(PlatformKpiSources.GitShaMalformed, malformedBody.GitSha.Source);
        Assert.DoesNotContain("latest", malformedJson, StringComparison.Ordinal);

        using var mutate = await platform.PostAsync("/api/v1/platform/ops/version", content: null);
        Assert.Equal(HttpStatusCode.MethodNotAllowed, mutate.StatusCode);
    }

    private static void AssertPublicInfoUnchanged(string json)
    {
        Assert.DoesNotContain("gitSha", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("commitSha", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("environmentName", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("buildId", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("buildTime", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("provenance", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("freshness", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("\"source\"", json, StringComparison.OrdinalIgnoreCase);
    }
}
