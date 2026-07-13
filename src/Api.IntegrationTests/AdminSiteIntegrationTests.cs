using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Site;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class AdminSiteIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task AdminSite_GetPutPublish_RoundTrip_Succeeds()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"site-test-{Guid.NewGuid():N}";

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);

        var getResponse = await client.GetAsync("/api/v1/admin/site");
        getResponse.EnsureSuccessStatusCode();

        var initial = await getResponse.Content.ReadFromJsonAsync<SitePageAdminResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(initial);
        Assert.True(initial.HasUnpublishedChanges);

        var draft = CreatePublishableDraft(slug);
        var putResponse = await client.PutAsJsonAsync(
            "/api/v1/admin/site",
            new UpdateSiteDraftRequest(draft),
            IntegrationTestHelpers.JsonOptions);
        putResponse.EnsureSuccessStatusCode();

        var saved = await putResponse.Content.ReadFromJsonAsync<SitePageAdminResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(saved);
        Assert.Equal("Cohestra", saved.Draft.SiteName);
        Assert.True(saved.HasUnpublishedChanges);

        var publishResponse = await client.PostAsync("/api/v1/admin/site/publish", content: null);
        publishResponse.EnsureSuccessStatusCode();

        var published = await publishResponse.Content.ReadFromJsonAsync<SitePageAdminResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(published);
        Assert.NotNull(published.Published);
        Assert.NotNull(published.PublishedAt);
        Assert.False(published.HasUnpublishedChanges);

        var publishedSnapshotJson = JsonSerializer.Serialize(
            published.Published,
            IntegrationTestHelpers.JsonOptions);

        var editedDraft = draft with { SiteName = "Edited Draft Name" };
        var editPutResponse = await client.PutAsJsonAsync(
            "/api/v1/admin/site",
            new UpdateSiteDraftRequest(editedDraft),
            IntegrationTestHelpers.JsonOptions);
        editPutResponse.EnsureSuccessStatusCode();

        var afterDraftEdit = await editPutResponse.Content.ReadFromJsonAsync<SitePageAdminResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(afterDraftEdit);
        Assert.Equal("Edited Draft Name", afterDraftEdit.Draft.SiteName);
        Assert.True(afterDraftEdit.HasUnpublishedChanges);
        Assert.NotNull(afterDraftEdit.Published);
        Assert.Equal(
            publishedSnapshotJson,
            JsonSerializer.Serialize(afterDraftEdit.Published, IntegrationTestHelpers.JsonOptions));

        var republishResponse = await client.PostAsync("/api/v1/admin/site/publish", content: null);
        republishResponse.EnsureSuccessStatusCode();
    }

    [SkippableFact]
    public async Task AdminSite_SavedTemplates_CreateApplyDelete_Succeeds()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"template-test-{Guid.NewGuid():N}";

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);

        var draft = CreatePublishableDraft(slug);
        var putResponse = await client.PutAsJsonAsync(
            "/api/v1/admin/site",
            new UpdateSiteDraftRequest(draft),
            IntegrationTestHelpers.JsonOptions);
        putResponse.EnsureSuccessStatusCode();

        var createResponse = await client.PostAsJsonAsync(
            "/api/v1/admin/site/templates",
            new CreateSiteHomepageTemplateRequest("Campaign layout"),
            IntegrationTestHelpers.JsonOptions);
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<SiteHomepageTemplateSummaryDto>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(created);
        Assert.Equal("Campaign layout", created.Name);
        Assert.True(created.SectionCount > 0);

        var applyResponse = await client.PostAsync(
            $"/api/v1/admin/site/templates/{created.Id}/apply",
            content: null);
        applyResponse.EnsureSuccessStatusCode();

        var applied = await applyResponse.Content.ReadFromJsonAsync<SitePageAdminResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(applied);
        Assert.Single(applied.SavedTemplates);
        Assert.Equal("Campaign layout", applied.SavedTemplates[0].Name);

        var deleteResponse = await client.DeleteAsync(
            $"/api/v1/admin/site/templates/{created.Id}");
        deleteResponse.EnsureSuccessStatusCode();

        var afterDelete = await deleteResponse.Content.ReadFromJsonAsync<SitePageAdminResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(afterDelete);
        Assert.Empty(afterDelete.SavedTemplates);
    }

    [SkippableFact]
    public async Task AdminSite_ApplyPreset_Showcase_Succeeds()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var applyResponse = await client.PostAsJsonAsync(
            "/api/v1/admin/site/apply-preset",
            new ApplySitePresetRequest("showcase"),
            IntegrationTestHelpers.JsonOptions);
        applyResponse.EnsureSuccessStatusCode();

        var applied = await applyResponse.Content.ReadFromJsonAsync<SitePageAdminResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(applied);
        Assert.Equal("showcase", applied.Draft.PresetId);
        Assert.Contains(applied.Draft.Sections, section => section.Type == "carousel");
        Assert.Contains(applied.Draft.Sections, section => section.Type == "testimonials");
    }

    [SkippableFact]
    public async Task AdminSite_Publish_RejectsInvalidDraft()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var emptyDraft = new SiteSectionsDocumentDto(
            SchemaVersion: 1,
            SiteName: "Empty",
            AccentColor: null,
            LogoAssetId: null,
            PresetId: null,
            Sections: []);

        var putResponse = await client.PutAsJsonAsync(
            "/api/v1/admin/site",
            new UpdateSiteDraftRequest(emptyDraft),
            IntegrationTestHelpers.JsonOptions);
        putResponse.EnsureSuccessStatusCode();

        var publishResponse = await client.PostAsync("/api/v1/admin/site/publish", content: null);
        Assert.Equal(HttpStatusCode.BadRequest, publishResponse.StatusCode);
    }

    [SkippableFact]
    public async Task AdminSite_Publish_RejectsUnpublishedActivityCta()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var draftSlug = $"draft-only-{Guid.NewGuid():N}";

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            var now = DateTimeOffset.UtcNow;
            dbContext.Activities.Add(new Activity
            {
                Id = Guid.NewGuid(),
                Name = "Draft Activity",
                Slug = draftSlug,
                Category = "Test",
                Schedule = "Saturday",
                Location = "Test",
                CommunityLabel = "Test",
                Status = ActivityStatus.Draft,
                CreatedAt = now,
                UpdatedAt = now,
            });
            await dbContext.SaveChangesAsync();
        }

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var draft = CreatePublishableDraft(draftSlug, ctaTarget: $"activity:{draftSlug}");
        var putResponse = await client.PutAsJsonAsync(
            "/api/v1/admin/site",
            new UpdateSiteDraftRequest(draft),
            IntegrationTestHelpers.JsonOptions);
        putResponse.EnsureSuccessStatusCode();

        var publishResponse = await client.PostAsync("/api/v1/admin/site/publish", content: null);
        Assert.Equal(HttpStatusCode.BadRequest, publishResponse.StatusCode);
    }

    [SkippableFact]
    public async Task AdminSite_Publish_RejectsEmptyCarousel()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, accessToken);

        var draft = CreatePublishableDraftWithCarousel();
        var putResponse = await client.PutAsJsonAsync(
            "/api/v1/admin/site",
            new UpdateSiteDraftRequest(draft),
            IntegrationTestHelpers.JsonOptions);
        putResponse.EnsureSuccessStatusCode();

        var publishResponse = await client.PostAsync("/api/v1/admin/site/publish", content: null);
        Assert.Equal(HttpStatusCode.BadRequest, publishResponse.StatusCode);
    }

    private static SiteSectionsDocumentDto CreatePublishableDraft(
        string activitySlug,
        string? ctaTarget = null)
    {
        using var propsDocument = JsonDocument.Parse(
            $$"""
            {
              "headline": "Community activities. Meaningful connections.",
              "primaryCta": { "label": "Browse events", "target": "{{ctaTarget ?? "scroll-upcoming"}}" }
            }
            """);
        var props = JsonSerializer.Deserialize<JsonElement>(propsDocument.RootElement.GetRawText());

        return new SiteSectionsDocumentDto(
            SchemaVersion: 1,
            SiteName: "Cohestra",
            AccentColor: "#c45c26",
            LogoAssetId: null,
            PresetId: "community",
            Sections:
            [
                new SiteSectionDto(
                    "hero-1",
                    "hero",
                    true,
                    0,
                    props),
            ]);
    }

    private static SiteSectionsDocumentDto CreatePublishableDraftWithCarousel()
    {
        using var heroPropsDocument = JsonDocument.Parse(
            """
            {
              "headline": "Community activities. Meaningful connections.",
              "primaryCta": { "label": "Browse events", "target": "scroll-upcoming" }
            }
            """);
        using var carouselPropsDocument = JsonDocument.Parse(
            """
            {
              "title": "Featured",
              "slides": [{ "headline": "", "imageAssetId": "" }]
            }
            """);

        var heroProps = JsonSerializer.Deserialize<JsonElement>(heroPropsDocument.RootElement.GetRawText());
        var carouselProps = JsonSerializer.Deserialize<JsonElement>(
            carouselPropsDocument.RootElement.GetRawText());

        return new SiteSectionsDocumentDto(
            SchemaVersion: 1,
            SiteName: "Cohestra",
            AccentColor: "#c45c26",
            LogoAssetId: null,
            PresetId: "community",
            Sections:
            [
                new SiteSectionDto("hero-1", "hero", true, 0, heroProps),
                new SiteSectionDto("carousel-1", "carousel", true, 1, carouselProps),
            ]);
    }
}
