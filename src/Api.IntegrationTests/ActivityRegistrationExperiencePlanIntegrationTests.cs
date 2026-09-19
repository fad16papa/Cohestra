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
public sealed class ActivityRegistrationExperiencePlanIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task UpdateActivity_BasicTenantSplitExperience_Returns403PlanLocked()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var (client, activity) = await CreateTenantWithPublishedActivityAsync(TenantPlan.Basic);

        using var updateResponse = await client.PutAsJsonAsync(
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
    }

    [SkippableFact]
    public async Task UpdateActivity_BasicTenantPosterExperience_Returns403PlanLocked()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var (client, activity) = await CreateTenantWithPublishedActivityAsync(TenantPlan.Basic);

        using var updateResponse = await client.PutAsJsonAsync(
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
        var body = await updateResponse.Content.ReadAsStringAsync();
        Assert.Contains("plan_locked", body, StringComparison.OrdinalIgnoreCase);
    }

    [SkippableFact]
    public async Task UpdateActivity_CoreTenantConversationalExperience_Returns403PlanLocked()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var (client, activity) = await CreateTenantWithPublishedActivityAsync(TenantPlan.Core);

        using var updateResponse = await client.PutAsJsonAsync(
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
        var body = await updateResponse.Content.ReadAsStringAsync();
        Assert.Contains("plan_locked", body, StringComparison.OrdinalIgnoreCase);
    }

    private async Task<(HttpClient Client, Activity Activity)> CreateTenantWithPublishedActivityAsync(
        TenantPlan plan)
    {
        var slug = $"exp-{Guid.NewGuid():N}"[..16];
        var adminEmail = $"admin-{slug}@example.com";

        using var platformClient = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
        IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);

        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platformClient,
            "Registration experience plan gate",
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

        return (client, activity);
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
}
