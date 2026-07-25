using System.Text.Json;
using Cohestra.Contracts.Site;
using Cohestra.Domain.Site;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Seed;
using Cohestra.Infrastructure.Site;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Seed;

public sealed class SitePageSeederTests
{
    [Fact]
    public async Task SeedAsync_WhenNoRow_CreatesPublishedSitePageAndCacheEntry()
    {
        var cache = new CapturingPublishedSiteCache();
        await using var provider = CreateServiceProvider(cache);

        await SitePageSeeder.SeedAsync(provider);

        await using var scope = provider.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var page = await dbContext.SitePages.SingleAsync(item => item.TenantId == TenantIds.Default);

        Assert.NotNull(page.PublishedSections);
        Assert.NotNull(page.PublishedAt);
        Assert.Equal("Cohestra", page.PublishedSections!.SiteName);
        Assert.Equal(5, page.PublishedSections.Sections.Count);
        Assert.NotNull(cache.LastEntry);
        Assert.Equal("Cohestra", cache.LastEntry!.Published.SiteName);
    }

    [Fact]
    public async Task SeedAsync_WhenPublishedExists_SkipsWithoutChangingData()
    {
        var cache = new CapturingPublishedSiteCache();
        await using var provider = CreateServiceProvider(cache);

        await using (var scope = provider.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            dbContext.SitePages.Add(new SitePage
            {
                Id = SitePage.SingletonId,
                TenantId = TenantIds.Default,
                DraftSections = CreateDraft("Existing draft"),
                PublishedSections = CreateDraft("Existing published"),
                DraftUpdatedAt = DateTimeOffset.UtcNow,
                PublishedAt = DateTimeOffset.UtcNow,
                SchemaVersion = 1,
            });
            await dbContext.SaveChangesAsync();
        }

        await SitePageSeeder.SeedAsync(provider);

        await using var verifyScope = provider.CreateAsyncScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var page = await verifyDb.SitePages.SingleAsync(item => item.TenantId == TenantIds.Default);

        Assert.Equal("Existing published", page.PublishedSections!.SiteName);
        Assert.Null(cache.LastEntry);
    }

    [Fact]
    public async Task SeedAsync_WhenOperatorDraftExists_SkipsWithoutPublishing()
    {
        var cache = new CapturingPublishedSiteCache();
        await using var provider = CreateServiceProvider(cache);

        await using (var scope = provider.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            dbContext.SitePages.Add(new SitePage
            {
                Id = SitePage.SingletonId,
                TenantId = TenantIds.Default,
                DraftSections = CreateDraft("Operator edited"),
                PublishedSections = null,
                DraftUpdatedAt = DateTimeOffset.UtcNow,
                SchemaVersion = 1,
            });
            await dbContext.SaveChangesAsync();
        }

        await SitePageSeeder.SeedAsync(provider);

        await using var verifyScope = provider.CreateAsyncScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var page = await verifyDb.SitePages.SingleAsync(item => item.TenantId == TenantIds.Default);

        Assert.Equal("Operator edited", page.DraftSections!.SiteName);
        Assert.Null(page.PublishedSections);
        Assert.Null(cache.LastEntry);
    }

    [Fact]
    public async Task SeedAsync_WhenEmptyDefaultDraftExists_PopulatesDraftAndPublished()
    {
        var cache = new CapturingPublishedSiteCache();
        await using var provider = CreateServiceProvider(cache);

        await using (var scope = provider.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            dbContext.SitePages.Add(new SitePage
            {
                Id = SitePage.SingletonId,
                TenantId = TenantIds.Default,
                DraftSections = new SiteSectionsDocument
                {
                    SchemaVersion = 1,
                    SiteName = string.Empty,
                    Sections = [],
                },
                PublishedSections = null,
                DraftUpdatedAt = DateTimeOffset.UtcNow,
                SchemaVersion = 1,
            });
            await dbContext.SaveChangesAsync();
        }

        await SitePageSeeder.SeedAsync(provider);

        await using var verifyScope = provider.CreateAsyncScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var page = await verifyDb.SitePages.SingleAsync(item => item.TenantId == TenantIds.Default);

        Assert.Equal("Cohestra", page.DraftSections!.SiteName);
        Assert.Equal("Cohestra", page.PublishedSections!.SiteName);
        Assert.NotNull(page.PublishedAt);
        Assert.NotNull(cache.LastEntry);
    }

    [Fact]
    public async Task SeedAsync_WhenCacheSetFails_StillPersistsPublishedSitePage()
    {
        var cache = new FailingPublishedSiteCache();
        await using var provider = CreateServiceProvider(cache);

        await SitePageSeeder.SeedAsync(provider);

        await using var scope = provider.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var page = await dbContext.SitePages.SingleAsync(item => item.TenantId == TenantIds.Default);

        Assert.Equal("Cohestra", page.PublishedSections!.SiteName);
        Assert.NotNull(page.PublishedAt);
    }

    [Theory]
    [InlineData(null, 0, true)]
    [InlineData("", 0, true)]
    [InlineData("Edited", 0, false)]
    [InlineData("", 1, false)]
    public void IsEmptyDefaultDraft_MatchesStory91EmptyDraftShape(
        string? siteName,
        int sectionCount,
        bool expected)
    {
        SiteSectionsDocument? draft = siteName is null
            ? null
            : new SiteSectionsDocument
            {
                SchemaVersion = 1,
                SiteName = siteName,
                Sections = sectionCount == 0
                    ? []
                    : [new SiteSection { Id = "hero-1", Type = "hero", Enabled = true, Order = 0, Props = default }],
            };

        Assert.Equal(expected, SitePageSeeder.IsEmptyDefaultDraft(draft));
    }

    private static ServiceProvider CreateServiceProvider(IPublishedSiteCache cache)
    {
        var services = new ServiceCollection();
        var databaseName = Guid.NewGuid().ToString();
        services.AddDbContext<CohestraDbContext>(options =>
            options.UseInMemoryDatabase(databaseName));
        services.AddSingleton<IOptions<SiteLandingSeedSettings>>(
            Options.Create(new SiteLandingSeedSettings()));
        services.AddSingleton<IPublishedSiteCache>(cache);
        services.AddSingleton<ILoggerFactory>(_ => NullLoggerFactory.Instance);

        return services.BuildServiceProvider();
    }

    private static SiteSectionsDocument CreateDraft(string siteName) =>
        new()
        {
            SchemaVersion = 1,
            SiteName = siteName,
            Sections =
            [
                new SiteSection
                {
                    Id = "hero-1",
                    Type = "hero",
                    Enabled = true,
                    Order = 0,
                    Props = JsonSerializer.SerializeToElement(new { headline = siteName }),
                },
            ],
        };

    private sealed class CapturingPublishedSiteCache : IPublishedSiteCache
    {
        public PublishedSiteCacheEntry? LastEntry { get; private set; }

        public Task<PublishedSiteCacheEntry?> GetAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(LastEntry);

        public Task SetAsync(
            Guid tenantId,
            PublishedSiteCacheEntry entry,
            CancellationToken cancellationToken = default)
        {
            LastEntry = entry;
            return Task.CompletedTask;
        }

        public Task InvalidateAsync(Guid tenantId, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }

    private sealed class FailingPublishedSiteCache : IPublishedSiteCache
    {
        public Task<PublishedSiteCacheEntry?> GetAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<PublishedSiteCacheEntry?>(null);

        public Task SetAsync(
            Guid tenantId,
            PublishedSiteCacheEntry entry,
            CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("Simulated Redis failure.");

        public Task InvalidateAsync(Guid tenantId, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }
}
