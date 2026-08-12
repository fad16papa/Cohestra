using Cohestra.Application.Activities;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Registrations;
using Cohestra.Infrastructure.Tenancy;
using Cohestra.Infrastructure.Tenants;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Cohestra.Infrastructure.Activities;

public sealed class ActivityService(
    CohestraDbContext dbContext,
    IOptions<PublicWebOptions> publicWebOptions,
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

        var capacityError = ActivityCapacityValidator.ValidateMaxRegistrants(request.MaxRegistrants);
        if (capacityError is not null)
        {
            throw new InvalidOperationException(capacityError);
        }

        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId)
        {
            throw new InvalidOperationException("Tenant context is required to create an activity.");
        }

        var planLimitError = await ValidateMaxRegistrantsAgainstTenantPlanAsync(
            request.MaxRegistrants,
            tenantId,
            cancellationToken);
        if (planLimitError is not null)
        {
            throw new InvalidOperationException(planLimitError);
        }

        var catalogError = await ValidateActivityCatalogAsync(
            request.Category,
            request.CommunityLabel,
            cancellationToken);
        if (catalogError is not null)
        {
            throw new InvalidOperationException(catalogError);
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
                MaxRegistrants = request.MaxRegistrants,
                Status = ActivityStatus.Draft,
                CreatedAt = now,
                UpdatedAt = now,
            };

            dbContext.Activities.Add(activity);

            try
            {
                await dbContext.SaveChangesAsync(cancellationToken);
                return await ToActivityResponseAsync(activity, cancellationToken: cancellationToken);
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

        return await ToActivityResponseAsync(activity, registrationCount, cancellationToken);
    }

    public async Task<ActivityListResponse> ListAsync(
        string? status,
        string? category,
        string? community,
        string? search,
        int page,
        int pageSize,
        string? sortBy = null,
        string? sortDirection = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize < 1
            ? DefaultPageSize
            : Math.Min(pageSize, MaxPageSize);
        var sortField = ParseListSortBy(sortBy);
        var descending = ResolveListSortDescending(sortField, sortDirection);

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
        query = ApplyListSort(query, sortField, descending);
        var activities = await query
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

        var communityLabels = activities
            .Select(activity => activity.CommunityLabel)
            .Distinct(StringComparer.Ordinal)
            .ToList();

        var communities = communityLabels.Count == 0
            ? new Dictionary<string, Community>(StringComparer.Ordinal)
            : await dbContext.Communities
                .AsNoTracking()
                .Where(community => communityLabels.Contains(community.Name))
                .ToDictionaryAsync(community => community.Name, cancellationToken);

        var items = activities
            .Select(activity => ToActivityResponse(
                activity,
                ResolveRegistrationTheme(activity, communities.GetValueOrDefault(activity.CommunityLabel)),
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

        var registrationCount = await dbContext.Registrations
            .AsNoTracking()
            .CountAsync(registration => registration.ActivityId == id, cancellationToken);

        var capacityError = ActivityCapacityValidator.ValidateMaxRegistrantsAgainstCount(
            request.MaxRegistrants,
            registrationCount);
        if (capacityError is not null)
        {
            throw new InvalidOperationException(capacityError);
        }

        if (request.MaxRegistrants != activity.MaxRegistrants)
        {
            var planLimitError = await ValidateMaxRegistrantsAgainstTenantPlanAsync(
                request.MaxRegistrants,
                activity.TenantId,
                cancellationToken);
            if (planLimitError is not null)
            {
                throw new InvalidOperationException(planLimitError);
            }
        }

        var catalogError = await ValidateActivityCatalogAsync(
            request.Category,
            request.CommunityLabel,
            cancellationToken);
        if (catalogError is not null)
        {
            throw new InvalidOperationException(catalogError);
        }

        activity.Name = request.Name.Trim();
        activity.Category = request.Category.Trim();
        activity.Schedule = request.Schedule.Trim();
        activity.Location = request.Location.Trim();
        activity.CommunityLabel = request.CommunityLabel.Trim();
        // Persist the uploaded/external URL as provided; browser resolution happens on read.
        activity.HeroImageUrl = ActivityBrandingValidator.NormalizeHeroImageUrl(request.HeroImageUrl);
        activity.AccentColor = ActivityBrandingValidator.NormalizeAccentColor(request.AccentColor);
        activity.MaxRegistrants = request.MaxRegistrants;

        if (request.RegistrationTheme is not null)
        {
            var theme = RegistrationThemeMapper.FromDto(request.RegistrationTheme);
            var themeError = RegistrationThemeValidator.Validate(theme);
            if (themeError is not null)
            {
                throw new InvalidOperationException(themeError);
            }

            activity.RegistrationTheme = RegistrationThemeValidator.Normalize(theme!);
        }

        activity.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        await SyncPublicActivityCacheAsync(activity, cancellationToken);

        return await ToActivityResponseAsync(activity, registrationCount, cancellationToken);
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

        return await ToActivityResponseAsync(activity, cancellationToken: cancellationToken);
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

        return await ToActivityResponseAsync(activity, cancellationToken: cancellationToken);
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

        return await ToActivityResponseAsync(activity, cancellationToken: cancellationToken);
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
            var previousSlug = activity.Slug;
            await ActivitySlugGenerator.EnsureSlugForPublishAsync(
                dbContext,
                activity,
                cancellationToken);

            var publishGateError = PublishGateValidator.ValidateForPublish(activity.FormSchema);
            if (publishGateError is not null)
            {
                throw new InvalidOperationException(publishGateError);
            }

            var publishLimitError = await ValidatePublishedActivityPlanLimitAsync(
                activity.TenantId,
                cancellationToken);
            if (publishLimitError is not null)
            {
                throw new InvalidOperationException(publishLimitError);
            }

            activity.Status = ActivityStatus.Published;
            activity.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);

            if (!string.Equals(previousSlug, activity.Slug, StringComparison.Ordinal)
                && !string.IsNullOrWhiteSpace(previousSlug))
            {
                await publicActivityCache.InvalidateAsync(
                    activity.TenantId,
                    previousSlug,
                    cancellationToken);
            }

            await SyncPublicActivityCacheAsync(activity, cancellationToken);
        }

        return await ToActivityResponseAsync(activity, cancellationToken: cancellationToken);
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

        var cached = await publicActivityCache.GetAsync(tenantId, normalizedSlug, cancellationToken);
        if (cached is not null)
        {
            return await EnrichWithRegistrationPauseStateAsync(
                ResolvePublicResponse(cached),
                tenantId,
                cancellationToken);
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

        var response = await MapToPublicResponseAsync(activity, cancellationToken);

        if (activity.Status == ActivityStatus.Published)
        {
            await publicActivityCache.SetAsync(tenantId, normalizedSlug, response, cancellationToken);
        }

        return await EnrichWithRegistrationPauseStateAsync(response, tenantId, cancellationToken);
    }

    public async Task RefreshPublicActivityCacheBySlugAsync(
        Guid tenantId,
        string activitySlug,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(activitySlug))
        {
            return;
        }

        var normalizedSlug = activitySlug.Trim().ToLowerInvariant();
        var activity = await dbContext.Activities
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.TenantId == tenantId && item.Slug == normalizedSlug,
                cancellationToken);

        if (activity is null)
        {
            await publicActivityCache.InvalidateAsync(tenantId, normalizedSlug, cancellationToken);
            return;
        }

        await SyncPublicActivityCacheAsync(activity, cancellationToken);
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

        return await ToActivityResponseAsync(activity, cancellationToken: cancellationToken);
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
        if (activity.Status == ActivityStatus.Published)
        {
            var response = await MapToPublicResponseAsync(activity, cancellationToken);
            await publicActivityCache.SetAsync(
                activity.TenantId,
                activity.Slug,
                response,
                cancellationToken);
            return;
        }

        await publicActivityCache.InvalidateAsync(activity.TenantId, activity.Slug, cancellationToken);
    }

    private ActivityRegistrationLinkResponse BuildRegistrationLink(string slug)
    {
        if (!currentTenant.IsResolved || string.IsNullOrWhiteSpace(currentTenant.Slug))
        {
            throw new InvalidOperationException(
                "Tenant context is required to build a registration link.");
        }

        if (!ActivitySlugGenerator.IsValidSlug(slug))
        {
            throw new InvalidOperationException(
                "A valid registration slug is required before sharing the public link.");
        }

        var path = $"/register/{slug}";
        var url = TenantPublicWebUrlBuilder.BuildTenantPath(
            publicWebOptions.Value.BaseUrl,
            currentTenant.Slug,
            path);

        return new ActivityRegistrationLinkResponse(url, slug, path);
    }

    private async Task<ActivityResponse> ToActivityResponseAsync(
        Activity activity,
        int registrationCount = 0,
        CancellationToken cancellationToken = default)
    {
        var community = await LoadCommunityByLabelAsync(activity.CommunityLabel, cancellationToken);
        var resolved = ResolveRegistrationTheme(activity, community);
        return ToActivityResponse(activity, resolved, registrationCount);
    }

    private static ActivityResponse ToActivityResponse(
        Activity activity,
        ResolvedRegistrationThemeDto resolvedTheme,
        int registrationCount = 0) =>
        ActivityMapper.ToResponse(
            activity,
            ResolveRegistrationThemeForBrowser(resolvedTheme),
            registrationCount,
            ResolveHeroImageUrl(activity.HeroImageUrl));

    private static ResolvedRegistrationThemeDto ResolveRegistrationTheme(
        Activity activity,
        Community? community) =>
        RegistrationThemeResolver.Resolve(activity.RegistrationTheme, community, activity);

    private static ResolvedRegistrationThemeDto ResolveRegistrationThemeForBrowser(
        ResolvedRegistrationThemeDto resolvedTheme) =>
        resolvedTheme with
        {
            HeroImageUrl = ResolveHeroImageUrl(resolvedTheme.HeroImageUrl),
        };

    private async Task<Community?> LoadCommunityByLabelAsync(
        string communityLabel,
        CancellationToken cancellationToken)
    {
        var normalized = communityLabel?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return null;
        }

        return await dbContext.Communities
            .AsNoTracking()
            .FirstOrDefaultAsync(community => community.Name == normalized, cancellationToken);
    }

    private static string? ResolveHeroImageUrl(string? heroImageUrl) =>
        ActivityHeroImageUrlResolver.ResolveForBrowser(heroImageUrl);

    private async Task<PublicActivityResponse> MapToPublicResponseAsync(
        Activity activity,
        CancellationToken cancellationToken)
    {
        var registrationCount = 0;
        if (activity.Status == ActivityStatus.Published)
        {
            registrationCount = await dbContext.Registrations
                .AsNoTracking()
                .CountAsync(registration => registration.ActivityId == activity.Id, cancellationToken);
        }

        var community = await LoadCommunityByLabelAsync(activity.CommunityLabel, cancellationToken);
        var resolved = ResolveRegistrationThemeForBrowser(
            ResolveRegistrationTheme(activity, community));

        return new PublicActivityResponse(
            activity.Slug,
            activity.Name,
            activity.Status.ToString().ToLowerInvariant(),
            activity.Status == ActivityStatus.Published,
            activity.Schedule,
            activity.Location,
            activity.CommunityLabel,
            resolved.HeroImageUrl,
            resolved.AccentColor,
            resolved.Preset,
            resolved.LogoAssetId,
            activity.Status == ActivityStatus.Published
                ? FormSchemaMapper.ToDto(activity.FormSchema)
                : null,
            activity.MaxRegistrants,
            registrationCount,
            ActivityCapacityValidator.IsRegistrationFull(activity.MaxRegistrants, registrationCount),
            IsRegistrationPaused: false);
    }

    private async Task<PublicActivityResponse> EnrichWithRegistrationPauseStateAsync(
        PublicActivityResponse response,
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        if (!response.IsRegistrationOpen)
        {
            return response;
        }

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .Where(item => item.Id == tenantId)
            .Select(item => new { item.RegistrationTimeZoneId, item.Plan })
            .FirstOrDefaultAsync(cancellationToken);

        if (tenant is null)
        {
            return response;
        }

        var now = DateTimeOffset.UtcNow;
        var monthStart = RegistrationPeriod.GetMonthStartUtc(now, tenant.RegistrationTimeZoneId);
        var registrationsThisMonth = await dbContext.Registrations
            .AsNoTracking()
            .CountAsync(
                registration => registration.TenantId == tenantId && registration.CreatedAt >= monthStart,
                cancellationToken);
        var limit = TenantPlanLimits.For(tenant.Plan).RegistrationsPerMonth;
        var isPaused = registrationsThisMonth >= limit;

        return isPaused
            ? response with { IsRegistrationPaused = true }
            : response;
    }

    private PublicActivityResponse ResolvePublicResponse(PublicActivityResponse response) =>
        response with
        {
            HeroImageUrl = ResolveHeroImageUrl(response.HeroImageUrl),
        };

    private async Task<string?> ValidateActivityCatalogAsync(
        string category,
        string communityLabel,
        CancellationToken cancellationToken)
    {
        var normalizedCategory = category?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(normalizedCategory))
        {
            return "Category is required.";
        }

        var categoryExists = await dbContext.Categories
            .AsNoTracking()
            .AnyAsync(item => item.Name == normalizedCategory, cancellationToken);

        if (!categoryExists)
        {
            return $"Category '{normalizedCategory}' is not in your catalog. Add it under Categories first.";
        }

        var normalizedCommunity = communityLabel?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(normalizedCommunity))
        {
            return "Community is required.";
        }

        var communityExists = await dbContext.Communities
            .AsNoTracking()
            .AnyAsync(item => item.Name == normalizedCommunity, cancellationToken);

        if (!communityExists)
        {
            return $"Community '{normalizedCommunity}' is not in your catalog. Add it under Communities first.";
        }

        return null;
    }

    private async Task<string?> ValidateMaxRegistrantsAgainstTenantPlanAsync(
        int? maxRegistrants,
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        if (maxRegistrants is null)
        {
            return null;
        }

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == tenantId, cancellationToken);

        if (tenant is null)
        {
            return "Tenant not found.";
        }

        var planLimit = TenantPlanLimits.For(tenant.Plan).RegistrationsPerMonth;
        return ActivityCapacityValidator.ValidateMaxRegistrantsAgainstPlanLimit(
            maxRegistrants,
            planLimit);
    }

    private async Task<string?> ValidatePublishedActivityPlanLimitAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == tenantId, cancellationToken);

        if (tenant is null)
        {
            return null;
        }

        var limits = TenantPlanLimits.For(tenant.Plan);
        var publishedCount = await dbContext.Activities
            .AsNoTracking()
            .CountAsync(
                item => item.TenantId == tenantId && item.Status == ActivityStatus.Published,
                cancellationToken);

        return TenantPlanLimitValidator.ValidateCanPublishActivity(
            publishedCount,
            limits.PublishedActivities);
    }

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

    private enum ActivityListSortBy
    {
        Name,
        CreatedAt,
        UpdatedAt,
        RegistrationCount,
    }

    private static ActivityListSortBy ParseListSortBy(string? sortBy) =>
        sortBy?.Trim().ToLowerInvariant() switch
        {
            "name" => ActivityListSortBy.Name,
            "createdat" or "created_at" => ActivityListSortBy.CreatedAt,
            "updatedat" or "updated_at" => ActivityListSortBy.UpdatedAt,
            "registrationcount" or "registration_count" => ActivityListSortBy.RegistrationCount,
            null or "" => ActivityListSortBy.UpdatedAt,
            _ => ActivityListSortBy.UpdatedAt,
        };

    private static bool ResolveListSortDescending(
        ActivityListSortBy sortBy,
        string? sortDirection)
    {
        if (!string.IsNullOrWhiteSpace(sortDirection))
        {
            return !string.Equals(sortDirection.Trim(), "asc", StringComparison.OrdinalIgnoreCase);
        }

        return sortBy != ActivityListSortBy.Name;
    }

    private IQueryable<Activity> ApplyListSort(
        IQueryable<Activity> query,
        ActivityListSortBy sortBy,
        bool descending) =>
        (sortBy, descending) switch
        {
            (ActivityListSortBy.Name, false) => query.OrderBy(activity => activity.Name),
            (ActivityListSortBy.Name, true) => query.OrderByDescending(activity => activity.Name),
            (ActivityListSortBy.CreatedAt, false) => query.OrderBy(activity => activity.CreatedAt),
            (ActivityListSortBy.CreatedAt, true) => query.OrderByDescending(activity => activity.CreatedAt),
            (ActivityListSortBy.UpdatedAt, false) => query.OrderBy(activity => activity.UpdatedAt),
            (ActivityListSortBy.UpdatedAt, true) => query.OrderByDescending(activity => activity.UpdatedAt),
            (ActivityListSortBy.RegistrationCount, false) => query.OrderBy(activity =>
                dbContext.Registrations.Count(registration => registration.ActivityId == activity.Id)),
            (ActivityListSortBy.RegistrationCount, true) => query.OrderByDescending(activity =>
                dbContext.Registrations.Count(registration => registration.ActivityId == activity.Id)),
            _ => query.OrderByDescending(activity => activity.UpdatedAt),
        };
}
