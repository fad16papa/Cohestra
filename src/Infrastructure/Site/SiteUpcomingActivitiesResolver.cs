using System.Text.Json;
using Cohestra.Contracts.Site;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
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

        var limit = ResolveLimit(published);
        var utcNow = DateTimeOffset.UtcNow;

        var tenantTimeZoneId = await dbContext.Tenants
            .AsNoTracking()
            .Where(tenant => tenant.Id == tenantId)
            .Select(tenant => tenant.RegistrationTimeZoneId)
            .FirstOrDefaultAsync(cancellationToken) ?? RegistrationTimeZoneDefaults.Utc;

        var activities = await dbContext.IgnoreTenantFilters<Activity>()
            .AsNoTracking()
            .Where(activity =>
                activity.TenantId == tenantId &&
                activity.Status == ActivityStatus.Published &&
                activity.ShowOnHomepage)
            .ToListAsync(cancellationToken);

        return activities
            .Where(activity => !ActivityScheduleExpiration.IsPastEventEnd(
                activity,
                tenantTimeZoneId,
                utcNow))
            .OrderBy(activity => ActivityScheduleExpiration.ResolveStartsAt(
                activity,
                tenantTimeZoneId,
                utcNow) ?? DateTimeOffset.MaxValue)
            .Take(limit)
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
