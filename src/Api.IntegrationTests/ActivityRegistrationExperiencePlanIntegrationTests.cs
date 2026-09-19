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
public sealed class ActivityRegistrationExperiencePlanIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task UpdateActivity_BasicTenantSplitExperience_Returns403PlanLocked()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await SetDefaultTenantPlanAsync(TenantPlan.Basic);

        var slug = $"exp-basic-{Guid.NewGuid():N}"[..20];
        var activity = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            TenantIds.Default,
            slug);

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}",
            new UpdateActivityRequest(
                activity.Name,
                activity.Category,
                activity.Schedule,
                activity.Location,
                activity.CommunityLabel,
                HeroImageUrl: activity.HeroImageUrl,
                AccentColor: activity.AccentColor,
                MaxRegistrants: activity.MaxRegistrants,
                RegistrationTheme: new RegistrationThemeDto(
                    Preset: "classic",
                    InheritCommunityBrand: true,
                    AccentColor: null,
                    HeroImageUrl: null,
                    Experience: new RegistrationExperienceDto(Layout: "split"))),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.Forbidden, updateResponse.StatusCode);
        var body = await updateResponse.Content.ReadAsStringAsync();
        Assert.Contains("plan_locked", body, StringComparison.OrdinalIgnoreCase);

        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);
    }

    [SkippableFact]
    public async Task UpdateActivity_BasicTenantPosterExperience_Returns403PlanLocked()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await SetDefaultTenantPlanAsync(TenantPlan.Basic);

        var slug = $"exp-poster-{Guid.NewGuid():N}"[..20];
        var activity = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            TenantIds.Default,
            slug);

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}",
            new UpdateActivityRequest(
                activity.Name,
                activity.Category,
                activity.Schedule,
                activity.Location,
                activity.CommunityLabel,
                HeroImageUrl: activity.HeroImageUrl,
                AccentColor: activity.AccentColor,
                MaxRegistrants: activity.MaxRegistrants,
                RegistrationTheme: new RegistrationThemeDto(
                    Preset: "classic",
                    InheritCommunityBrand: true,
                    AccentColor: null,
                    HeroImageUrl: null,
                    Experience: new RegistrationExperienceDto(Layout: "poster"))),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.Forbidden, updateResponse.StatusCode);

        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);
    }

    [SkippableFact]
    public async Task UpdateActivity_CoreTenantConversationalExperience_Returns403PlanLocked()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await SetDefaultTenantPlanAsync(TenantPlan.Core);

        var slug = $"exp-conv-{Guid.NewGuid():N}"[..20];
        var activity = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            TenantIds.Default,
            slug);

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}",
            new UpdateActivityRequest(
                activity.Name,
                activity.Category,
                activity.Schedule,
                activity.Location,
                activity.CommunityLabel,
                HeroImageUrl: activity.HeroImageUrl,
                AccentColor: activity.AccentColor,
                MaxRegistrants: activity.MaxRegistrants,
                RegistrationTheme: new RegistrationThemeDto(
                    Preset: "classic",
                    InheritCommunityBrand: true,
                    AccentColor: null,
                    HeroImageUrl: null,
                    Experience: new RegistrationExperienceDto(Flow: "conversational"))),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.Forbidden, updateResponse.StatusCode);

        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);
    }

    private async Task SetDefaultTenantPlanAsync(TenantPlan plan)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var tenant = await db.Tenants.SingleAsync(item => item.Id == TenantIds.Default);
        tenant.Plan = plan;
        await db.SaveChangesAsync();
    }
}
