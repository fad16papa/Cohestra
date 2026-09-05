using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

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

        try
        {
            await EnsureDefaultTenantPlanAsync(TenantPlan.Basic);

            using var adminClient = Factory.CreateClient();
            var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
            IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

            var schema = BuildMinimalSchema();
            var firstName = $"First template {Guid.NewGuid():N}";
            using var firstResponse = await adminClient.PostAsJsonAsync(
                "/api/v1/admin/form-templates",
                new CreateFormTemplateRequest(firstName, schema),
                IntegrationTestHelpers.JsonOptions);
            Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

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
        finally
        {
            await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);
        }
    }

    [SkippableFact]
    public async Task CreateFormTemplate_WhenDuplicateName_Returns409Conflict()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

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

    private async Task EnsureDefaultTenantPlanAsync(TenantPlan plan)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);

        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var tenant = await dbContext.Tenants.FirstAsync(t => t.Id == TenantIds.Default);
        tenant.Plan = plan;
        tenant.UpdatedAt = DateTimeOffset.UtcNow;

        // Ignore filters so leftover templates from earlier tests always clear for this tenant.
        var existingTemplates = await dbContext.IgnoreTenantFilters<TenantFormTemplate>()
            .Where(template => template.TenantId == TenantIds.Default)
            .ToListAsync();
        dbContext.TenantFormTemplates.RemoveRange(existingTemplates);

        await dbContext.SaveChangesAsync();

        var remaining = await dbContext.IgnoreTenantFilters<TenantFormTemplate>()
            .CountAsync(template => template.TenantId == TenantIds.Default);
        Assert.Equal(0, remaining);
    }
}
