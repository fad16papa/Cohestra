using Cohestra.Domain.Site;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Seed;
using Cohestra.Infrastructure.Site;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Site;

/// <summary>
/// Seeds a fixed Core SitePage when a tenant upgrades to Core (Story 15.3).
/// </summary>
public static class SitePageCoreSeedHelper
{
    public static async Task EnsureCoreSitePageAsync(
        CohestraDbContext dbContext,
        IPublishedSiteCache publishedSiteCache,
        IOptions<SiteLandingSeedSettings> landingSeedSettings,
        ILogger logger,
        Guid tenantId,
        string tenantName,
        CancellationToken cancellationToken = default)
    {
        var exists = await dbContext.SitePages.AnyAsync(p => p.TenantId == tenantId, cancellationToken);
        if (exists)
        {
            return;
        }

        var settings = landingSeedSettings.Value;
        var document = SitePageSeedDocumentBuilder.Build(settings);
        document.SiteName = string.IsNullOrWhiteSpace(tenantName) ? document.SiteName : tenantName.Trim();

        var now = DateTimeOffset.UtcNow;
        var page = new SitePage
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            SchemaVersion = 1,
            DraftSections = document,
            DraftUpdatedAt = now,
            PublishedSections = Clone(document),
            PublishedAt = now,
        };

        dbContext.SitePages.Add(page);
        await dbContext.SaveChangesAsync(cancellationToken);
        await publishedSiteCache.InvalidateAsync(tenantId, cancellationToken);

        logger.LogInformation("Seeded fixed Core SitePage for tenant {TenantId}", tenantId);
    }

    private static SiteSectionsDocument Clone(SiteSectionsDocument source) =>
        System.Text.Json.JsonSerializer.Deserialize<SiteSectionsDocument>(
            SiteSectionsDocumentJson.Serialize(source),
            SiteSectionsDocumentJson.SerializerOptions)
        ?? throw new InvalidOperationException("Could not clone site document.");
}
