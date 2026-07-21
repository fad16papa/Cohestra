using System.Text.Json;
using Cohestra.Contracts.Site;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Site;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Site;

public sealed class SiteUpcomingActivitiesResolverTests
{
    [Fact]
    public void ResolveLimit_UsesDefaultWhenSectionMissing()
    {
        var published = CreatePublished([]);

        var limit = SiteUpcomingActivitiesResolver.ResolveLimit(published);

        Assert.Equal(SiteUpcomingActivitiesResolver.DefaultLimit, limit);
    }

    [Fact]
    public void ResolveLimit_ClampsConfiguredLimit()
    {
        var published = CreatePublished(
        [
            CreateSection("upcoming-1", "upcomingActivities", true, """{"limit": 20}"""),
        ]);

        var limit = SiteUpcomingActivitiesResolver.ResolveLimit(published);

        Assert.Equal(SiteUpcomingActivitiesResolver.MaxLimit, limit);
    }

    [Fact]
    public void ResolveLimit_IgnoresDisabledSection()
    {
        var published = CreatePublished(
        [
            CreateSection("upcoming-1", "upcomingActivities", false, """{"limit": 4}"""),
        ]);

        var limit = SiteUpcomingActivitiesResolver.ResolveLimit(published);

        Assert.Equal(SiteUpcomingActivitiesResolver.DefaultLimit, limit);
    }

    [Fact]
    public async Task LoadAsync_ReturnsOnlyPublishedShowOnHomepageActivities()
    {
        await using var dbContext = CreateDbContext();
        var now = DateTimeOffset.UtcNow;

        dbContext.Activities.AddRange(
            CreateActivity("published-visible", ActivityStatus.Published, showOnHomepage: true, now),
            CreateActivity("published-hidden", ActivityStatus.Published, showOnHomepage: false, now),
            CreateActivity("draft-visible", ActivityStatus.Draft, showOnHomepage: true, now),
            CreateActivity("archived-visible", ActivityStatus.Archived, showOnHomepage: true, now));
        await dbContext.SaveChangesAsync();

        var published = CreatePublished(
        [
            CreateSection("upcoming-1", "upcomingActivities", true, """{"limit": 6}"""),
        ]);

        var results = await SiteUpcomingActivitiesResolver.LoadAsync(
            dbContext,
            published,
            "http://localhost:8080",
            TenantIds.Default);

        Assert.Single(results);
        Assert.Equal("published-visible", results[0].Slug);
    }

    [Fact]
    public async Task LoadAsync_RespectsConfiguredLimit()
    {
        await using var dbContext = CreateDbContext();
        var now = DateTimeOffset.UtcNow;

        for (var index = 0; index < 5; index++)
        {
            dbContext.Activities.Add(CreateActivity(
                $"published-{index}",
                ActivityStatus.Published,
                showOnHomepage: true,
                now.AddMinutes(-index)));
        }

        await dbContext.SaveChangesAsync();

        var published = CreatePublished(
        [
            CreateSection("upcoming-1", "upcomingActivities", true, """{"limit": 3}"""),
        ]);

        var results = await SiteUpcomingActivitiesResolver.LoadAsync(
            dbContext,
            published,
            "http://localhost:8080",
            TenantIds.Default);

        Assert.Equal(3, results.Count);
    }

    [Fact]
    public async Task LoadAsync_ScopesToRequestedTenant()
    {
        await using var dbContext = CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var otherTenant = Guid.CreateVersion7();

        dbContext.Activities.AddRange(
            CreateActivity("ours", ActivityStatus.Published, showOnHomepage: true, now, TenantIds.Default),
            CreateActivity("theirs", ActivityStatus.Published, showOnHomepage: true, now, otherTenant));
        await dbContext.SaveChangesAsync();

        var published = CreatePublished(
        [
            CreateSection("upcoming-1", "upcomingActivities", true, """{"limit": 6}"""),
        ]);

        var results = await SiteUpcomingActivitiesResolver.LoadAsync(
            dbContext,
            published,
            "http://localhost:8080",
            TenantIds.Default);

        Assert.Single(results);
        Assert.Equal("ours", results[0].Slug);
    }

    private static SiteSectionsDocumentDto CreatePublished(IReadOnlyList<SiteSectionDto> sections) =>
        new(
            SchemaVersion: 1,
            SiteName: "Test Site",
            AccentColor: null,
            LogoAssetId: null,
            PresetId: null,
            Sections: sections);

    private static SiteSectionDto CreateSection(
        string id,
        string type,
        bool enabled,
        string propsJson)
    {
        using var document = JsonDocument.Parse(propsJson);
        return new SiteSectionDto(
            id,
            type,
            enabled,
            0,
            JsonSerializer.Deserialize<JsonElement>(document.RootElement.GetRawText()));
    }

    private static Activity CreateActivity(
        string slug,
        ActivityStatus status,
        bool showOnHomepage,
        DateTimeOffset updatedAt,
        Guid? tenantId = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId ?? TenantIds.Default,
            Name = slug,
            Slug = slug,
            Category = "Test",
            Schedule = "Saturday 10:00",
            Location = "Test Court",
            CommunityLabel = "Test Community",
            Status = status,
            ShowOnHomepage = showOnHomepage,
            CreatedAt = updatedAt,
            UpdatedAt = updatedAt,
        };

    private static CohestraDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new CohestraDbContext(options);
    }
}
