using Cohestra.Application.Activities;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Campaigns;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Registrations;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Cohestra.Infrastructure.Activities;

public sealed class ActivityService(
    CohestraDbContext dbContext,
    IOptions<PublicWebOptions> publicWebOptions,
    IOptions<CampaignAssetOptions> campaignAssetOptions,
    RedisPublicActivityCache publicActivityCache,
    ICurrentTenant currentTenant) : IActivityService
{
    private const int DefaultPageSize = 25;
    private const int MaxPageSize = 100;

    public async Task<ActivityResponse> CreateAsync(
        CreateActivityRequest request,
        CancellationToken cancellationToken = default)
    {
        var status = ParseStatus(request.Status);
        if (status is ActivityStatus.Published or ActivityStatus.Archived)
        {
            throw new InvalidOperationException(
                "New activities must be created as draft. Use publish to go live.");
        }

        var now = DateTimeOffset.UtcNow;
        const int maxAttempts = 3;

        for (var attempt = 0; attempt < maxAttempts; attempt++)
        {
            var baseSlug = ActivitySlugGenerator.Slugify(request.Name);
            var slug = await ActivitySlugGenerator.EnsureUniqueSlugAsync(
                dbContext,
                baseSlug,
                excludeActivityId: null,
                cancellationToken);

            var activity = new Activity
            {
                Id = Guid.NewGuid(),
                Name = request.Name.Trim(),
                Slug = slug,
                Category = request.Category.Trim(),
                Schedule = request.Schedule.Trim(),
                Location = request.Location.Trim(),
                CommunityLabel = request.CommunityLabel.Trim(),
                Status = ActivityStatus.Draft,
                CreatedAt = now,
                UpdatedAt = now,
            };

            dbContext.Activities.Add(activity);

            try
            {
                await dbContext.SaveChangesAsync(cancellationToken);
                return ToActivityResponse(activity);
            }
            catch (DbUpdateException ex) when (IsUniqueSlugViolation(ex) && attempt < maxAttempts - 1)
            {
                dbContext.Entry(activity).State = EntityState.Detached;
            }
        }

        throw new InvalidOperationException("Could not allocate a unique activity slug.");
    }

    public async Task<ActivityResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var activity = await dbContext.Activities
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (activity is null)
        {
            return null;
        }

        var registrationCount = await dbContext.Registrations
            .AsNoTracking()
            .CountAsync(registration => registration.ActivityId == id, cancellationToken);

        return ToActivityResponse(activity, registrationCount);
    }

    public async Task<ActivityListResponse> ListAsync(
        string? status,
        string? category,
        string? community,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize < 1
            ? DefaultPageSize
            : Math.Min(pageSize, MaxPageSize);

        var query = dbContext.Activities.AsNoTracking();

        if (TryParseStatusFilter(status, out var statusFilter))
        {
            query = query.Where(activity => activity.Status == statusFilter);
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            var normalizedCategory = category.Trim().ToLower();
            query = query.Where(activity => activity.Category.ToLower() == normalizedCategory);
        }

        if (!string.IsNullOrWhiteSpace(community))
        {
            var normalizedCommunity = community.Trim().ToLower();
            query = query.Where(activity => activity.CommunityLabel.ToLower() == normalizedCommunity);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToLowerInvariant();
            query = query.Where(activity =>
                activity.Name.ToLower().Contains(normalizedSearch) ||
                activity.CommunityLabel.ToLower().Contains(normalizedSearch) ||
                activity.Category.ToLower().Contains(normalizedSearch) ||
                activity.Location.ToLower().Contains(normalizedSearch));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var activities = await query
            .OrderByDescending(activity => activity.UpdatedAt)
            .Skip((normalizedPage - 1) * normalizedPageSize)
            .Take(normalizedPageSize)
            .ToListAsync(cancellationToken);

        var activityIds = activities.Select(activity => activity.Id).ToList();
        var registrationCounts = activityIds.Count == 0
            ? new Dictionary<Guid, int>()
            : await dbContext.Registrations
                .AsNoTracking()
                .Where(registration => activityIds.Contains(registration.ActivityId))
                .GroupBy(registration => registration.ActivityId)
                .Select(group => new { ActivityId = group.Key, Count = group.Count() })
                .ToDictionaryAsync(item => item.ActivityId, item => item.Count, cancellationToken);

        var items = activities
            .Select(activity => ToActivityResponse(
                activity,
                registrationCounts.GetValueOrDefault(activity.Id)))
            .ToList();

        return new ActivityListResponse(items, normalizedPage, normalizedPageSize, totalCount);
    }

    public async Task<ActivityResponse?> UpdateAsync(
        Guid id,
        UpdateActivityRequest request,
        CancellationToken cancellationToken = default)
    {
        var activity = await dbContext.Activities.FirstOrDefaultAsync(
            item => item.Id == id,
            cancellationToken);

        if (activity is null)
        {
            return null;
        }

        if (activity.Status == ActivityStatus.Archived)
        {
            throw new InvalidOperationException("Archived activities cannot be edited.");
        }

        var heroError = ActivityBrandingValidator.ValidateHeroImageUrl(request.HeroImageUrl);
        if (heroError is not null)
        {
            throw new InvalidOperationException(heroError);
        }

        var accentError = ActivityBrandingValidator.ValidateAccentColor(request.AccentColor);
        if (accentError is not null)
        {
            throw new InvalidOperationException(accentError);
        }

        activity.Name = request.Name.Trim();
        activity.Category = request.Category.Trim();
        activity.Schedule = request.Schedule.Trim();
        activity.Location = request.Location.Trim();
        activity.CommunityLabel = request.CommunityLabel.Trim();
        activity.HeroImageUrl = ResolveHeroImageUrl(
            ActivityBrandingValidator.NormalizeHeroImageUrl(request.HeroImageUrl));
        activity.AccentColor = ActivityBrandingValidator.NormalizeAccentColor(request.AccentColor);
        activity.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        await SyncPublicActivityCacheAsync(activity, cancellationToken);

        return ToActivityResponse(activity);
    }

    public async Task<ActivityResponse?> UpdateShowOnHomepageAsync(
        Guid id,
        bool showOnHomepage,
        CancellationToken cancellationToken = default)
    {
        var activity = await dbContext.Activities.FirstOrDefaultAsync(
            item => item.Id == id,
            cancellationToken);

        if (activity is null)
        {
            return null;
        }

        if (activity.Status == ActivityStatus.Archived)
        {
            throw new InvalidOperationException("Archived activities cannot be edited.");
        }

        if (activity.Status != ActivityStatus.Published)
        {
            throw new InvalidOperationException(
                "Only published activities can be featured on the public site.");
        }

        activity.ShowOnHomepage = showOnHomepage;
        activity.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        await SyncPublicActivityCacheAsync(activity, cancellationToken);

        return ToActivityResponse(activity);
    }

    public async Task<ActivityResponse?> ArchiveAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var activity = await dbContext.Activities.FirstOrDefaultAsync(
            item => item.Id == id,
            cancellationToken);

        if (activity is null)
        {
            return null;
        }

        if (activity.Status != ActivityStatus.Archived)
        {
            activity.Status = ActivityStatus.Archived;
            activity.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
            await SyncPublicActivityCacheAsync(activity, cancellationToken);
        }

        return ToActivityResponse(activity);
    }

    public async Task<ActivityResponse?> UnpublishAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var activity = await dbContext.Activities.FirstOrDefaultAsync(
            item => item.Id == id,
            cancellationToken);

        if (activity is null)
        {
            return null;
        }

        if (activity.Status == ActivityStatus.Archived)
        {
            throw new InvalidOperationException("Archived activities cannot be unpublished.");
        }

        if (activity.Status == ActivityStatus.Published)
        {
            activity.Status = ActivityStatus.Draft;
            activity.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
            await SyncPublicActivityCacheAsync(activity, cancellationToken);
        }

        return ToActivityResponse(activity);
    }

    public async Task<ActivityResponse?> PublishAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var activity = await dbContext.Activities.FirstOrDefaultAsync(
            item => item.Id == id,
            cancellationToken);

        if (activity is null)
        {
            return null;
        }

        if (activity.Status == ActivityStatus.Archived)
        {
            throw new InvalidOperationException("Archived activities cannot be published.");
        }

        if (activity.Status == ActivityStatus.Draft)
        {
            var publishGateError = PublishGateValidator.ValidateForPublish(activity.FormSchema);
            if (publishGateError is not null)
            {
                throw new InvalidOperationException(publishGateError);
            }

            activity.Status = ActivityStatus.Published;
            activity.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
            await SyncPublicActivityCacheAsync(activity, cancellationToken);
        }

        return ToActivityResponse(activity);
    }

    public async Task<PublicActivityResponse?> GetPublicBySlugAsync(
        string slug,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return null;
        }

        if (!currentTenant.IsResolved || currentTenant.TenantId is null)
        {
            return null;
        }

        var tenantId = currentTenant.TenantId.Value;
        var normalizedSlug = slug.Trim().ToLowerInvariant();

        // Redis activity cache remains global until Story 13.2 — only reuse for default tenant.
        if (tenantId == TenantIds.Default)
        {
            var cached = await publicActivityCache.GetAsync(normalizedSlug, cancellationToken);
            if (cached is not null)
            {
                return ResolvePublicResponse(cached);
            }
        }

        var activity = await dbContext.Activities
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.Slug == normalizedSlug && item.TenantId == tenantId,
                cancellationToken);

        if (activity is null)
        {
            return null;
        }

        var response = MapToPublicResponse(activity);

        if (activity.Status == ActivityStatus.Published && tenantId == TenantIds.Default)
        {
            await publicActivityCache.SetAsync(normalizedSlug, response, cancellationToken);
        }

        return response;
    }

    public async Task<ActivityResponse?> UpdateFormSchemaAsync(
        Guid id,
        ActivityFormSchemaDto formSchema,
        CancellationToken cancellationToken = default)
    {
        var validationError = FormSchemaValidator.ValidateDto(formSchema);
        if (validationError is not null)
        {
            throw new ArgumentException(validationError);
        }

        var activity = await dbContext.Activities.FirstOrDefaultAsync(
            item => item.Id == id,
            cancellationToken);

        if (activity is null)
        {
            return null;
        }

        if (activity.Status == ActivityStatus.Archived)
        {
            throw new InvalidOperationException("Archived activities cannot be edited.");
        }

        activity.FormSchema = FormSchemaValidator.MapToDomain(formSchema);
        activity.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        await SyncPublicActivityCacheAsync(activity, cancellationToken);

        return ToActivityResponse(activity);
    }

    public async Task<ActivityRegistrationLinkResponse?> GetRegistrationLinkAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var activity = await dbContext.Activities
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (activity is null || activity.Status != ActivityStatus.Published)
        {
            return null;
        }

        return BuildRegistrationLink(activity.Slug);
    }

    public async Task<byte[]?> GetQrCodePngAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var activity = await dbContext.Activities
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (activity is null)
        {
            return null;
        }

        if (activity.Status != ActivityStatus.Published)
        {
            throw new InvalidOperationException(
                "QR code is available after the activity is published.");
        }

        var link = BuildRegistrationLink(activity.Slug);
        return ActivityQrCodeGenerator.GeneratePng(link.Url);
    }

    public async Task<ActivityRegistrationListResponse?> ListRegistrationsAsync(
        Guid activityId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var activityExists = await dbContext.Activities
            .AsNoTracking()
            .AnyAsync(activity => activity.Id == activityId, cancellationToken);

        if (!activityExists)
        {
            return null;
        }

        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize < 1
            ? DefaultPageSize
            : Math.Min(pageSize, MaxPageSize);

        var query = dbContext.Registrations
            .AsNoTracking()
            .Include(registration => registration.Client)
            .Include(registration => registration.Activity)
            .Where(registration => registration.ActivityId == activityId);

        var totalCount = await query.CountAsync(cancellationToken);
        var registrations = await query
            .OrderByDescending(registration => registration.CreatedAt)
            .Skip((normalizedPage - 1) * normalizedPageSize)
            .Take(normalizedPageSize)
            .ToListAsync(cancellationToken);

        var items = registrations
            .Select(registration => new ActivityRegistrationListItemResponse(
                registration.Id,
                registration.RegistrationNumber,
                registration.ClientId,
                RegistrationRegistrantDisplayName.Resolve(registration),
                registration.CreatedAt))
            .ToList();

        return new ActivityRegistrationListResponse(
            items,
            normalizedPage,
            normalizedPageSize,
            totalCount);
    }

    private async Task SyncPublicActivityCacheAsync(
        Activity activity,
        CancellationToken cancellationToken)
    {
        // Global Redis keys until Story 13.2 — only Default tenant may touch them.
        // Non-default: no Set and no Invalidate (shared slug must not thrash Default's entry).
        if (activity.TenantId != TenantIds.Default)
        {
            return;
        }

        if (activity.Status == ActivityStatus.Published)
        {
            await publicActivityCache.SetAsync(
                activity.Slug,
                MapToPublicResponse(activity),
                cancellationToken);
            return;
        }

        await publicActivityCache.InvalidateAsync(activity.Slug, cancellationToken);
    }

    private ActivityRegistrationLinkResponse BuildRegistrationLink(string slug)
    {
        var baseUrl = publicWebOptions.Value.BaseUrl.Trim().TrimEnd('/');
        var path = $"/register/{slug}";

        return new ActivityRegistrationLinkResponse($"{baseUrl}{path}", slug, path);
    }

    private ActivityResponse ToActivityResponse(Activity activity, int registrationCount = 0) =>
        ActivityMapper.ToResponse(
            activity,
            registrationCount,
            ResolveHeroImageUrl(activity.HeroImageUrl));

    private string? ResolveHeroImageUrl(string? heroImageUrl) =>
        ActivityHeroImageUrlResolver.Resolve(
            heroImageUrl,
            campaignAssetOptions.Value.PublicApiBaseUrl);

    private PublicActivityResponse MapToPublicResponse(Activity activity) =>
        new(
            activity.Slug,
            activity.Name,
            activity.Status.ToString().ToLowerInvariant(),
            activity.Status == ActivityStatus.Published,
            activity.Schedule,
            activity.Location,
            activity.CommunityLabel,
            ResolveHeroImageUrl(activity.HeroImageUrl),
            activity.AccentColor,
            activity.Status == ActivityStatus.Published
                ? FormSchemaMapper.ToDto(activity.FormSchema)
                : null);

    private PublicActivityResponse ResolvePublicResponse(PublicActivityResponse response) =>
        response with
        {
            HeroImageUrl = ResolveHeroImageUrl(response.HeroImageUrl),
        };

    private static ActivityStatus? ParseStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return Enum.TryParse<ActivityStatus>(value.Trim(), ignoreCase: true, out var parsed)
            ? parsed
            : null;
    }

    private static bool TryParseStatusFilter(string? value, out ActivityStatus status)
    {
        status = default;

        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        return Enum.TryParse(value.Trim(), ignoreCase: true, out status);
    }

    private static bool IsUniqueSlugViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
        };
}
