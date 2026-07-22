using System.Text.Json;
using Cohestra.Application.PublicDoor;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.PublicDoor;
using Cohestra.Contracts.Site;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Site;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Campaigns;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Site;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.PublicDoor;

public sealed class PublicDoorService(
    ITenantHostResolver hostResolver,
    CohestraDbContext dbContext,
    IPublishedSiteCache publishedSiteCache,
    IOptions<CampaignAssetOptions> campaignAssetOptions) : IPublicDoorService
{
    public async Task<PublicDoorResponse> GetAsync(
        string? hostHeader,
        CancellationToken cancellationToken = default)
    {
        var door = await hostResolver.ResolveDoorAsync(hostHeader, cancellationToken);

        return door.Kind switch
        {
            TenantDoorKind.Marketing => new PublicDoorResponse(
                "marketing", null, null, null, null, [], false),
            TenantDoorKind.Unknown => new PublicDoorResponse(
                "unknown", null, null, null, null, [], false),
            TenantDoorKind.Suspended => new PublicDoorResponse(
                "suspended", door.Plan?.ToString(), door.TenantName, door.Slug, null, [], false),
            TenantDoorKind.Archived => new PublicDoorResponse(
                "archived", null, door.TenantName, door.Slug, null, [], false),
            TenantDoorKind.Active when door.TenantId is Guid tenantId && door.Plan is TenantPlan plan =>
                await BuildActiveDoorAsync(tenantId, door.TenantName ?? string.Empty, door.Slug ?? string.Empty, plan, cancellationToken),
            _ => new PublicDoorResponse("unknown", null, null, null, null, [], false),
        };
    }

    private async Task<PublicDoorResponse> BuildActiveDoorAsync(
        Guid tenantId,
        string tenantName,
        string slug,
        TenantPlan plan,
        CancellationToken cancellationToken)
    {
        var builderLocked = plan is TenantPlan.Core;

        if (plan is TenantPlan.Basic)
        {
            var stubActivities = await LoadStubActivitiesAsync(tenantId, cancellationToken);
            return new PublicDoorResponse(
                "active",
                plan.ToString(),
                tenantName,
                slug,
                null,
                stubActivities,
                true);
        }

        var site = await LoadPublishedSiteAsync(tenantId, cancellationToken);
        return new PublicDoorResponse(
            "active",
            plan.ToString(),
            tenantName,
            slug,
            site,
            site?.UpcomingActivities ?? [],
            builderLocked);
    }

    private async Task<IReadOnlyList<PublicStubActivityResponse>> LoadStubActivitiesAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var baseUrl = campaignAssetOptions.Value.PublicApiBaseUrl;
        var activities = await dbContext.Activities
            .AsNoTracking()
            .Where(a => a.TenantId == tenantId && a.Status == ActivityStatus.Published)
            .OrderByDescending(a => a.UpdatedAt)
            .Take(24)
            .ToListAsync(cancellationToken);

        return activities
            .Select(a => new PublicStubActivityResponse(
                a.Slug,
                a.Name,
                a.Schedule,
                a.Location,
                a.CommunityLabel,
                ActivityHeroImageUrlResolver.Resolve(a.HeroImageUrl, baseUrl),
                a.AccentColor))
            .ToList();
    }

    private async Task<PublicDoorSiteResponse?> LoadPublishedSiteAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        SiteSectionsDocumentDto? publishedDto;
        DateTimeOffset? publishedAt;

        var cached = await publishedSiteCache.GetAsync(tenantId, cancellationToken);
        if (cached is not null)
        {
            publishedDto = cached.Published;
            publishedAt = cached.PublishedAt;
        }
        else
        {
            var page = await dbContext.SitePages
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.TenantId == tenantId, cancellationToken);

            if (page?.PublishedSections is null || page.PublishedAt is null)
            {
                return null;
            }

            publishedDto = ToDto(page.PublishedSections);
            publishedAt = page.PublishedAt;
        }

        var upcoming = await SiteUpcomingActivitiesResolver.LoadAsync(
            dbContext,
            publishedDto,
            campaignAssetOptions.Value.PublicApiBaseUrl,
            tenantId,
            cancellationToken);

        return new PublicDoorSiteResponse(
            MapDocument(publishedDto),
            publishedAt,
            upcoming.Select(MapActivity).ToList());
    }

    private static PublicDoorSiteDocumentResponse MapDocument(SiteSectionsDocumentDto document) =>
        new(
            document.SchemaVersion,
            document.SiteName,
            document.AccentColor,
            document.LogoAssetId,
            document.PresetId,
            document.Sections.Select(section => new PublicDoorSiteSectionResponse(
                section.Id,
                section.Type,
                section.Enabled,
                section.Order,
                JsonSerializer.Deserialize<object>(section.Props.GetRawText()) ?? new { }))
                .ToList());

    private static PublicStubActivityResponse MapActivity(PublicHomepageActivityDto activity) =>
        new(
            activity.Slug,
            activity.Name,
            activity.Schedule,
            activity.Location,
            activity.CommunityLabel,
            activity.HeroImageUrl,
            activity.AccentColor);

    private static SiteSectionsDocumentDto ToDto(SiteSectionsDocument document) =>
        new(
            document.SchemaVersion,
            document.SiteName,
            document.AccentColor,
            document.LogoAssetId,
            document.PresetId,
            document.Sections
                .OrderBy(section => section.Order)
                .Select(section => new SiteSectionDto(
                    section.Id,
                    section.Type,
                    section.Enabled,
                    section.Order,
                    section.Props))
                .ToList());
}
