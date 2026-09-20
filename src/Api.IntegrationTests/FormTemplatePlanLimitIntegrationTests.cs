using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class FormTemplatePlanLimitIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task CreateFormTemplate_WhenBasicTenantAtSlotCap_Returns403PlanLocked()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"basic-ft-{Guid.NewGuid():N}"[..16];
        var adminEmail = $"admin-{slug}@example.com";

        using var platformClient = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
        IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);

        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platformClient,
            "Basic form template cap",
            slug,
            adminEmail);

        var (adminUser, adminPassword) = await IntegrationTestHelpers.CreateTenantAdminUserAsync(
            Factory.Services,
            tenant.Id,
            adminEmail);

        using var adminClient = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(adminClient, slug);
        var accessToken = await IntegrationTestHelpers.LoginAsync(
            adminClient,
            adminUser.Email!,
            adminPassword);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

        await AssertFormTemplateUsageAsync(adminClient, expectedUsed: 0, expectedLimit: 1);

        var schema = BuildMinimalSchema();
        var firstName = $"First template {Guid.NewGuid():N}";
        using var firstResponse = await adminClient.PostAsJsonAsync(
            "/api/v1/admin/form-templates",
            new CreateFormTemplateRequest(firstName, schema),
            IntegrationTestHelpers.JsonOptions);
        if (firstResponse.StatusCode != HttpStatusCode.Created)
        {
            var setupFailure = await ReadProblemDetailAsync(firstResponse);
            Assert.Fail(
                $"Expected Created for first Basic template, got {(int)firstResponse.StatusCode}: {setupFailure}");
        }

        using var secondResponse = await adminClient.PostAsJsonAsync(
            "/api/v1/admin/form-templates",
            new CreateFormTemplateRequest($"Second template {Guid.NewGuid():N}", schema),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.Forbidden, secondResponse.StatusCode);

        var errorCode = await IntegrationTestHelpers.ReadProblemErrorCodeAsync(secondResponse);
        Assert.Equal("plan_locked", errorCode);

        var detail = await ReadProblemDetailAsync(secondResponse);
        Assert.Contains("Core saves up to 5 form recipes", detail, StringComparison.OrdinalIgnoreCase);
    }

    [SkippableFact]
    public async Task CreateFormTemplate_WhenDuplicateName_Returns409Conflict()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        try
        {
            await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);
            await IntegrationTestHelpers.ClearDefaultTenantFormTemplatesAsync(Factory.Services);

            using var adminClient = Factory.CreateClient();
            var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
            IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

            var schema = BuildMinimalSchema();
            using var firstResponse = await adminClient.PostAsJsonAsync(
                "/api/v1/admin/form-templates",
                new CreateFormTemplateRequest("Saturday tennis", schema),
                IntegrationTestHelpers.JsonOptions);
            Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

            using var duplicateResponse = await adminClient.PostAsJsonAsync(
                "/api/v1/admin/form-templates",
                new CreateFormTemplateRequest("Saturday tennis", schema),
                IntegrationTestHelpers.JsonOptions);

            Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);
        }
        finally
        {
            await IntegrationTestHelpers.ClearDefaultTenantFormTemplatesAsync(Factory.Services);
        }
    }

    private static ActivityFormSchemaDto BuildMinimalSchema() =>
        new(
            1,
            [
                new FormFieldDefinitionDto(
                    "full_name",
                    "text",
                    "Full name",
                    true,
                    null,
                    null,
                    null,
                    null),
            ]);

    private static async Task AssertFormTemplateUsageAsync(
        HttpClient adminClient,
        int expectedUsed,
        int expectedLimit)
    {
        using var listResponse = await adminClient.GetAsync("/api/v1/admin/form-templates");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

        var list = await listResponse.Content.ReadFromJsonAsync<FormTemplateListResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(list);
        Assert.Equal(expectedUsed, list!.Usage.Used);
        Assert.Equal(expectedLimit, list.Usage.Limit);
    }

    private static async Task<string> ReadProblemDetailAsync(HttpResponseMessage response)
    {
        var raw = await response.Content.ReadAsStringAsync();
        using var document = System.Text.Json.JsonDocument.Parse(raw);
        if (document.RootElement.TryGetProperty("detail", out var detail)
            && detail.ValueKind == System.Text.Json.JsonValueKind.String)
        {
            return detail.GetString() ?? raw;
        }

        if (document.RootElement.TryGetProperty("Detail", out var detailPascal)
            && detailPascal.ValueKind == System.Text.Json.JsonValueKind.String)
        {
            return detailPascal.GetString() ?? raw;
        }

        return raw;
    }

}
