using System.Text.Json;
using Cohestra.Contracts.Site;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Site;

internal static class SiteUpcomingActivitiesResolver
{
    internal const int DefaultLimit = 6;
    internal const int MinLimit = 3;
    internal const int MaxLimit = 12;

    internal static int ResolveLimit(SiteSectionsDocumentDto published)
    {
        var section = published.Sections.FirstOrDefault(item =>
            item.Enabled &&
            string.Equals(item.Type, "upcomingActivities", StringComparison.OrdinalIgnoreCase));

        if (section is null ||
            section.Props.ValueKind != JsonValueKind.Object ||
            !section.Props.TryGetProperty("limit", out var limitElement) ||
            !limitElement.TryGetInt32(out var limit))
        {
            return DefaultLimit;
        }

        return Math.Clamp(limit, MinLimit, MaxLimit);
    }

    internal static async Task<IReadOnlyList<PublicHomepageActivityDto>> LoadAsync(
        CohestraDbContext dbContext,
        SiteSectionsDocumentDto published,
        string publicApiBaseUrl,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        _ = publicApiBaseUrl;
        _ = ResolveLimit(published);

        // All published activities for the tenant appear on the public homepage.
        // Schedule is operator-facing free text; UpdatedAt descending is the MVP ordering proxy.
        // Ignore ambient tenant filters — caller passes an explicit tenant id (e.g. public door host resolve).
        var activities = await dbContext.IgnoreTenantFilters<Activity>()
            .AsNoTracking()
            .Where(activity =>
                activity.TenantId == tenantId &&
                activity.Status == ActivityStatus.Published)
            .OrderByDescending(activity => activity.UpdatedAt)
            .ToListAsync(cancellationToken);

        return activities
            .Select(activity => new PublicHomepageActivityDto(
                activity.Slug,
                activity.Name,
                activity.Schedule,
                activity.Location,
                activity.CommunityLabel,
                ActivityHeroImageUrlResolver.ResolveForBrowser(activity.HeroImageUrl),
                activity.AccentColor))
            .ToList();
    }
}
