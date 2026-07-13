using System.Text.Json;
using LeadGenerationCrm.Domain.Site;
using LeadGenerationCrm.Infrastructure.Persistence;
using LeadGenerationCrm.Infrastructure.Site;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LeadGenerationCrm.Infrastructure.Seed;

public static class SitePageSeeder
{
    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(SitePageSeeder));
        var dbContext = scope.ServiceProvider.GetRequiredService<LeadGenerationCrmDbContext>();
        var settings = scope.ServiceProvider.GetRequiredService<IOptions<SiteLandingSeedSettings>>().Value;
        var publishedSiteCache = scope.ServiceProvider.GetRequiredService<IPublishedSiteCache>();

        var page = await dbContext.SitePages
            .FirstOrDefaultAsync(item => item.Id == SitePage.SingletonId, cancellationToken);

        if (page?.PublishedSections is not null)
        {
            logger.LogInformation("Site page seed skipped — published site already exists.");
            return;
        }

        if (page is not null && !IsEmptyDefaultDraft(page.DraftSections))
        {
            logger.LogInformation("Site page seed skipped — operator draft already exists.");
            return;
        }

        var document = SitePageSeedDocumentBuilder.Build(settings);
        var now = DateTimeOffset.UtcNow;

        if (page is null)
        {
            page = new SitePage
            {
                Id = SitePage.SingletonId,
                SchemaVersion = 1,
            };
            dbContext.SitePages.Add(page);

            try
            {
                ApplyPublishedSeed(page, document, now);
                await dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                dbContext.Entry(page).State = EntityState.Detached;
                page = await dbContext.SitePages
                    .FirstAsync(item => item.Id == SitePage.SingletonId, cancellationToken);

                if (page.PublishedSections is not null || !IsEmptyDefaultDraft(page.DraftSections))
                {
                    logger.LogInformation("Site page seed skipped — another instance seeded the site page.");
                    return;
                }

                ApplyPublishedSeed(page, document, now);
                await dbContext.SaveChangesAsync(cancellationToken);
            }
        }
        else
        {
            ApplyPublishedSeed(page, document, now);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        try
        {
            await publishedSiteCache.InvalidateAsync(cancellationToken);
            await publishedSiteCache.SetAsync(
                new PublishedSiteCacheEntry(SitePageSeedDocumentBuilder.ToDto(document), now),
                cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Site page seeded in database but Redis cache warm failed; public GET will populate cache on first request.");
        }

        logger.LogInformation("Seeded site page from landing defaults and published to public API cache.");
    }

    internal static bool IsEmptyDefaultDraft(SiteSectionsDocument? draft) =>
        draft is null ||
        (string.IsNullOrEmpty(draft.SiteName) && draft.Sections.Count == 0);

    internal static void ApplyPublishedSeed(
        SitePage page,
        SiteSectionsDocument document,
        DateTimeOffset publishedAt)
    {
        page.DraftSections = CloneDocument(document);
        page.PublishedSections = CloneDocument(document);
        page.DraftUpdatedAt = publishedAt;
        page.PublishedAt = publishedAt;
        page.PublishedByUserId = null;
        page.SchemaVersion = 1;
    }

    private static SiteSectionsDocument CloneDocument(SiteSectionsDocument source) =>
        JsonSerializer.Deserialize<SiteSectionsDocument>(
            SiteSectionsDocumentJson.Serialize(source),
            SiteSectionsDocumentJson.SerializerOptions)
        ?? throw new InvalidOperationException("Could not clone seeded site document.");
}
