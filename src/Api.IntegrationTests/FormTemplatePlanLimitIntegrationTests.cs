using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Activities;
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
        await EnsureDefaultTenantPlanAsync(TenantPlan.Basic);

        using var adminClient = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

        var schema = BuildMinimalSchema();
        using var firstResponse = await adminClient.PostAsJsonAsync(
            "/api/v1/admin/form-templates",
            new CreateFormTemplateRequest("First template", schema),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

        using var secondResponse = await adminClient.PostAsJsonAsync(
            "/api/v1/admin/form-templates",
            new CreateFormTemplateRequest("Second template", schema),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.Forbidden, secondResponse.StatusCode);

        var errorCode = await IntegrationTestHelpers.ReadProblemErrorCodeAsync(secondResponse);
        Assert.Equal("plan_locked", errorCode);
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

    private async Task EnsureDefaultTenantPlanAsync(TenantPlan plan)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);

        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var tenant = await dbContext.Tenants.FirstAsync(t => t.Id == TenantIds.Default);
        tenant.Plan = plan;
        tenant.UpdatedAt = DateTimeOffset.UtcNow;

        var existingTemplates = await dbContext.TenantFormTemplates
            .Where(template => template.TenantId == TenantIds.Default)
            .ToListAsync();
        dbContext.TenantFormTemplates.RemoveRange(existingTemplates);

        await dbContext.SaveChangesAsync();
    }
}
