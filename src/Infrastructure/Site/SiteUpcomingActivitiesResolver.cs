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
        CancellationToken cancellationToken = default)
    {
        var limit = ResolveLimit(published);

        // Schedule is operator-facing free text; UpdatedAt descending is the MVP ordering proxy.
        var activities = await dbContext.Activities
            .AsNoTracking()
            .Where(activity =>
                activity.Status == ActivityStatus.Published &&
                activity.ShowOnHomepage)
            .OrderByDescending(activity => activity.UpdatedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);

        return activities
            .Select(activity => new PublicHomepageActivityDto(
                activity.Slug,
                activity.Name,
                activity.Schedule,
                activity.Location,
                activity.CommunityLabel,
                ActivityHeroImageUrlResolver.Resolve(activity.HeroImageUrl, publicApiBaseUrl),
                activity.AccentColor))
            .ToList();
    }
}
