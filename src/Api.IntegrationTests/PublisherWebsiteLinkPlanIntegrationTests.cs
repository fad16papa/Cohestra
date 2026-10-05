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
public sealed class PublisherWebsiteLinkPlanIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task SaveFormSchema_BasicCraftedPublisherLink_SucceedsAndNormalizes()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var (client, activity, _) = await CreateTenantWithPublishedActivityAsync(TenantPlan.Basic);

        using var saveResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}/form-schema",
            new SaveActivityFormSchemaRequest(BuildSchema(showPublisherWebsiteLink: true)),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.OK, saveResponse.StatusCode);
        var saved = await saveResponse.Content.ReadFromJsonAsync<ActivityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.Null(saved?.FormSchema?.Meta?.ShowPublisherWebsiteLink);
    }

    [SkippableTheory]
    [InlineData(TenantPlan.Core)]
    [InlineData(TenantPlan.Pro)]
    public async Task SaveFormSchema_EligiblePlan_PersistsExplicitFalse(TenantPlan plan)
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var (client, activity, _) = await CreateTenantWithPublishedActivityAsync(plan);

        using var saveResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}/form-schema",
            new SaveActivityFormSchemaRequest(BuildSchema(showPublisherWebsiteLink: false)),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.OK, saveResponse.StatusCode);
        var saved = await saveResponse.Content.ReadFromJsonAsync<ActivityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.False(saved?.FormSchema?.Meta?.ShowPublisherWebsiteLink);
    }

    [SkippableFact]
    public async Task DowngradeCoreToBasic_NextSaveClearsPublisherLink_PublicRegisterStillOk()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var (client, activity, tenantId) = await CreateTenantWithPublishedActivityAsync(TenantPlan.Core);

        using var enableResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}/form-schema",
            new SaveActivityFormSchemaRequest(BuildSchema(showPublisherWebsiteLink: true)),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, enableResponse.StatusCode);

        await SetTenantPlanAsync(tenantId, TenantPlan.Basic);

        using var saveAfterDowngrade = await client.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}/form-schema",
            new SaveActivityFormSchemaRequest(BuildSchema(showPublisherWebsiteLink: true)),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, saveAfterDowngrade.StatusCode);
        var saved = await saveAfterDowngrade.Content.ReadFromJsonAsync<ActivityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.Null(saved?.FormSchema?.Meta?.ShowPublisherWebsiteLink);

        using var publicResponse = await client.GetAsync(
            $"/api/v1/public/activities/{activity.Slug}");
        Assert.Equal(HttpStatusCode.OK, publicResponse.StatusCode);
    }

    [SkippableFact]
    public async Task UpgradeBasicToCore_ExistingSchemaRemainsAndFlagCanBeEnabled()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var (client, activity, tenantId) = await CreateTenantWithPublishedActivityAsync(TenantPlan.Basic);

        using var basicSave = await client.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}/form-schema",
            new SaveActivityFormSchemaRequest(BuildSchema(showPublisherWebsiteLink: null)),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, basicSave.StatusCode);
        var before = await basicSave.Content.ReadFromJsonAsync<ActivityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal("email", before!.FormSchema!.Fields[0].Id);

        await SetTenantPlanAsync(tenantId, TenantPlan.Core);

        using var coreSave = await client.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}/form-schema",
            new SaveActivityFormSchemaRequest(BuildSchema(showPublisherWebsiteLink: true)),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, coreSave.StatusCode);
        var after = await coreSave.Content.ReadFromJsonAsync<ActivityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.True(after?.FormSchema?.Meta?.ShowPublisherWebsiteLink);
        Assert.Equal("email", after!.FormSchema!.Fields[0].Id);
    }

    private async Task<(HttpClient Client, Activity Activity, Guid TenantId)>
        CreateTenantWithPublishedActivityAsync(TenantPlan plan)
    {
        var slug = $"web-{Guid.NewGuid():N}"[..16];
        var adminEmail = $"admin-{slug}@example.com";

        using var platformClient = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
        IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);

        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platformClient,
            "Publisher website link plan gate",
            slug,
            adminEmail);

        if (plan != TenantPlan.Basic)
        {
            await SetTenantPlanAsync(tenant.Id, plan);
        }

        var (_, adminPassword) = await IntegrationTestHelpers.CreateTenantAdminUserAsync(
            Factory.Services,
            tenant.Id,
            adminEmail);

        var activitySlug = $"act-{Guid.NewGuid():N}"[..20];
        var activity = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            tenant.Id,
            activitySlug);

        var client = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(client, slug);
        var accessToken = await IntegrationTestHelpers.LoginAsync(
            client,
            adminEmail,
            adminPassword);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        return (client, activity, tenant.Id);
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

    private static ActivityFormSchemaDto BuildSchema(bool? showPublisherWebsiteLink) =>
        new(
            Version: 1,
            Fields:
            [
                new FormFieldDefinitionDto(
                    "email",
                    FormFieldTypes.Email,
                    "Email",
                    true,
                    null,
                    null,
                    null,
                    null),
            ],
            Meta: new FormSchemaMetaDto(
                IntroMarkdown: null,
                ShowPublisherWebsiteLink: showPublisherWebsiteLink));
}
