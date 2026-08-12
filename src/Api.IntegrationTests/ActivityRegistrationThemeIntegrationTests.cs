using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Activities;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class ActivityRegistrationThemeIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task UpdateActivity_RegistrationThemeInheritsCommunityBrand()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        var communityName = $"Theme Community {Guid.NewGuid():N}";
        var logoId = Guid.NewGuid().ToString();

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var createCommunityResponse = await client.PostAsJsonAsync(
            "/api/v1/admin/communities",
            new CreateCommunityRequest(communityName),
            IntegrationTestHelpers.JsonOptions);
        createCommunityResponse.EnsureSuccessStatusCode();

        var community = await createCommunityResponse.Content.ReadFromJsonAsync<CommunityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(community);

        var brandUpdateResponse = await client.PatchAsJsonAsync(
            $"/api/v1/admin/communities/{community!.Id}",
            new UpdateCommunityRequest(
                communityName,
                LogoAssetId: logoId,
                AccentColor: "#2d6a4f",
                DefaultHeroImageUrl: "https://example.com/community-hero.jpg",
                BrandKitIncluded: true),
            IntegrationTestHelpers.JsonOptions);
        brandUpdateResponse.EnsureSuccessStatusCode();

        var slug = $"theme-{Guid.NewGuid():N}"[..20];
        var activity = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            TenantIds.Default,
            slug,
            name: $"Theme Activity {Guid.NewGuid():N}"[..28]);

        using (var scope = Factory.Services.CreateScope())
        {
            IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            var entity = await db.Activities.FindAsync(activity.Id);
            Assert.NotNull(entity);
            entity!.CommunityLabel = communityName;
            entity.HeroImageUrl = null;
            entity.AccentColor = null;
            await db.SaveChangesAsync();
        }

        var theme = new RegistrationThemeDto(
            Preset: "card",
            InheritCommunityBrand: true,
            AccentColor: null,
            HeroImageUrl: null);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}",
            new UpdateActivityRequest(
                activity.Name,
                activity.Category,
                activity.Schedule,
                activity.Location,
                communityName,
                HeroImageUrl: null,
                AccentColor: null,
                MaxRegistrants: activity.MaxRegistrants,
                RegistrationTheme: theme),
            IntegrationTestHelpers.JsonOptions);
        updateResponse.EnsureSuccessStatusCode();

        var updated = await updateResponse.Content.ReadFromJsonAsync<ActivityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(updated);
        Assert.NotNull(updated!.RegistrationTheme);
        Assert.Equal("card", updated.RegistrationTheme!.Preset);
        Assert.True(updated.RegistrationTheme.InheritCommunityBrand);
        Assert.Equal("#2d6a4f", updated.ResolvedRegistrationTheme.AccentColor);
        Assert.Equal("https://example.com/community-hero.jpg", updated.ResolvedRegistrationTheme.HeroImageUrl);
        Assert.Equal(logoId, updated.ResolvedRegistrationTheme.LogoAssetId);

        var publicResponse = await client.GetAsync($"/api/v1/public/activities/{slug}");
        publicResponse.EnsureSuccessStatusCode();

        var published = await publicResponse.Content.ReadFromJsonAsync<PublicActivityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(published);
        Assert.Equal("card", published!.Preset);
        Assert.Equal("#2d6a4f", published.AccentColor);
        Assert.Equal(logoId, published.LogoAssetId);

        await client.DeleteAsync($"/api/v1/admin/communities/{community.Id}");
    }

    [SkippableFact]
    public async Task UpdateActivity_RegistrationThemeInvalidPreset_Returns400()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        var slug = $"bad-preset-{Guid.NewGuid():N}"[..20];
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
                activity.HeroImageUrl,
                activity.AccentColor,
                activity.MaxRegistrants,
                new RegistrationThemeDto("neon", true, null, null)),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
    }
}
