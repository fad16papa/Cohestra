using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Site;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Site;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Site;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class PublicSiteIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task PublicSite_Get_Returns404BeforePublish()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        await ClearPublishedSiteAsync(Factory.Services);

        using var client = Factory.CreateClient();
        var response = await client.GetAsync("/api/v1/public/site");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [SkippableFact]
    public async Task PublicSite_Get_ReturnsPublishedSiteWithUpcomingActivities()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var visibleSlug = $"public-visible-{Guid.NewGuid():N}";
        var hiddenSlug = $"public-hidden-{Guid.NewGuid():N}";

        await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, visibleSlug);

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            var now = DateTimeOffset.UtcNow;
            dbContext.Activities.Add(new Activity
            {
                Id = Guid.NewGuid(),
                Name = "Hidden Homepage Activity",
                Slug = hiddenSlug,
                Category = "Test",
                Schedule = "Sunday",
                Location = "Hidden Court",
                CommunityLabel = "Hidden",
                Status = ActivityStatus.Published,
                ShowOnHomepage = false,
                CreatedAt = now,
                UpdatedAt = now,
            });
            await dbContext.SaveChangesAsync();
        }

        using var adminClient = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

        var draft = CreatePublishableDraft(visibleSlug);
        var putResponse = await adminClient.PutAsJsonAsync(
            "/api/v1/admin/site",
            new UpdateSiteDraftRequest(draft),
            IntegrationTestHelpers.JsonOptions);
        putResponse.EnsureSuccessStatusCode();

        var publishResponse = await adminClient.PostAsync("/api/v1/admin/site/publish", content: null);
        publishResponse.EnsureSuccessStatusCode();

        using var publicClient = Factory.CreateClient();
        var publicResponse = await publicClient.GetAsync("/api/v1/public/site");
        publicResponse.EnsureSuccessStatusCode();

        var cacheControl = publicResponse.Headers.CacheControl;
        Assert.NotNull(cacheControl);
        Assert.True(cacheControl.Public);
        Assert.Equal(TimeSpan.FromSeconds(60), cacheControl.MaxAge);

        var site = await publicResponse.Content.ReadFromJsonAsync<PublicSiteResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(site);
        Assert.NotNull(site.PublishedAt);
        Assert.Equal("Cohestra", site.Published.SiteName);
        Assert.Contains(site.UpcomingActivities, activity => activity.Slug == visibleSlug);
        Assert.DoesNotContain(site.UpcomingActivities, activity => activity.Slug == hiddenSlug);
    }

    [SkippableFact]
    public async Task PublicSite_Get_ServesFromCacheAfterPublish()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"cache-site-{Guid.NewGuid():N}";
        await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);

        using var adminClient = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

        var draft = CreatePublishableDraft(slug);
        await adminClient.PutAsJsonAsync(
            "/api/v1/admin/site",
            new UpdateSiteDraftRequest(draft),
            IntegrationTestHelpers.JsonOptions);
        await adminClient.PostAsync("/api/v1/admin/site/publish", content: null);

        using var publicClient = Factory.CreateClient();
        publicClient.DefaultRequestHeaders.Add("X-Test-Request", "1");

        var firstResponse = await publicClient.GetAsync("/api/v1/public/site");
        firstResponse.EnsureSuccessStatusCode();

        var cache = Factory.Services.GetRequiredService<RedisPublishedSiteCache>();
        var cached = await cache.GetAsync();
        Assert.NotNull(cached);
        Assert.Equal("Cohestra", cached.Published.SiteName);

        var secondResponse = await publicClient.GetAsync("/api/v1/public/site");
        secondResponse.EnsureSuccessStatusCode();
    }

    private static async Task ClearPublishedSiteAsync(IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var cache = scope.ServiceProvider.GetRequiredService<RedisPublishedSiteCache>();

        var page = await dbContext.SitePages
            .FirstOrDefaultAsync(item => item.TenantId == TenantIds.Default);

        if (page is not null)
        {
            page.PublishedSections = null;
            page.PublishedAt = null;
            page.PublishedByUserId = null;
            await dbContext.SaveChangesAsync();
        }

        await cache.InvalidateAsync();
    }

    private static SiteSectionsDocumentDto CreatePublishableDraft(string activitySlug)
    {
        using var propsDocument = JsonDocument.Parse(
            """
            {
              "headline": "Community activities. Meaningful connections.",
              "primaryCta": { "label": "Browse events", "target": "scroll-upcoming" }
            }
            """);
        var heroProps = JsonSerializer.Deserialize<JsonElement>(propsDocument.RootElement.GetRawText());

        using var upcomingPropsDocument = JsonDocument.Parse("""{"limit": 6}""");
        var upcomingProps = JsonSerializer.Deserialize<JsonElement>(upcomingPropsDocument.RootElement.GetRawText());

        return new SiteSectionsDocumentDto(
            SchemaVersion: 1,
            SiteName: "Cohestra",
            AccentColor: "#c45c26",
            LogoAssetId: null,
            PresetId: "community",
            Sections:
            [
                new SiteSectionDto("hero-1", "hero", true, 0, heroProps),
                new SiteSectionDto("upcoming-1", "upcomingActivities", true, 1, upcomingProps),
            ]);
    }
}
